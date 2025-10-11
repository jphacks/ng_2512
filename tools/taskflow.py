#!/usr/bin/env python3
import re
import json
from pathlib import Path
from typing import Dict, Set, Tuple, List

BASE_PRIMARY = Path('adm.dot')
BASE_FALLBACK = Path('development_flow/adm.dot')
STATUS_JSON = Path('development_flow/status.json')
OUT_DOT = Path('development_flow/adm.dot')

# Accept compact IDs from adm.dot like FB11, FL23, RN22, CI1, SEC3, QA2
ID_PATTERN = re.compile(r'\b(?:(?:FB|FL|RN)[0-9]{2}|(?:CI|SEC|QA)[0-9]{1,2}|FIN)\b')


def parse_edges(dot_text: str) -> List[Tuple[str, str]]:
    edges: List[Tuple[str, str]] = []
    for raw in dot_text.splitlines():
        line = raw.split('//')[0]
        if '->' not in line:
            continue
        # split by space or semicolon
        parts = re.split(r'[;\s]+', line.strip())
        for i in range(len(parts) - 2):
            if parts[i+1] == '->':
                a, b = parts[i], parts[i+2]
                if ID_PATTERN.fullmatch(a) or a == 'FIN':
                    pass
                else:
                    # skip non-task pseudo nodes quietly
                    pass
                edges.append((a, b))
    return edges


def collect_nodes(edges: List[Tuple[str, str]]) -> Set[str]:
    nodes: Set[str] = set()
    for a, b in edges:
        if a:
            nodes.add(a)
        if b:
            nodes.add(b)
    return nodes


def predecessors(edges: List[Tuple[str, str]]) -> Dict[str, Set[str]]:
    pred: Dict[str, Set[str]] = {}
    for a, b in edges:
        pred.setdefault(b, set()).add(a)
        pred.setdefault(a, set())  # ensure key exists
    return pred


def load_status(nodes: Set[str]) -> Dict[str, str]:
    if STATUS_JSON.exists():
        data = json.loads(STATUS_JSON.read_text())
    else:
        data = {}
    # initialize new nodes to pending (exclude FIN)
    for n in nodes:
        if n == 'FIN':
            continue
        if ID_PATTERN.fullmatch(n) and n not in data:
            data[n] = 'pending'
    # prune removed nodes
    for n in list(data.keys()):
        if n not in nodes:
            del data[n]
    STATUS_JSON.parent.mkdir(parents=True, exist_ok=True)
    STATUS_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    return data


def assignable(pred: Dict[str, Set[str]], status: Dict[str, str]) -> List[str]:
    ready = []
    for n, deps in pred.items():
        if n == 'FIN':
            continue
        if not ID_PATTERN.fullmatch(n):
            continue
        if status.get(n) in ('done', 'in_progress'):
            continue
        # consider only deps that are task IDs (ignore FIN)
        dep_tasks = [d for d in deps if ID_PATTERN.fullmatch(d)]
        if all(status.get(d) == 'done' for d in dep_tasks):
            ready.append(n)
    return sorted(ready)


def render_with_status(dot_text: str, status: Dict[str, str], ready: Set[str]) -> str:
    # Remove any previously inserted status annotations to avoid duplication
    dot_text = strip_status_annotations(dot_text)
    # Node styles by state
    style = {
        'done':  {'style': 'filled', 'fillcolor': '#c8e6c9', 'color': '#2e7d32'},
        'in_progress': {'style': 'filled', 'fillcolor': '#fff59d', 'color': '#f9a825'},
        'ready': {'style': 'filled,bold', 'fillcolor': '#bbdefb', 'color': '#1565c0'},
        'blocked': {'style': 'filled', 'fillcolor': '#eeeeee', 'color': '#9e9e9e'},
    }
    # collect nodes seen in dot
    edges = parse_edges(dot_text)
    nodes = collect_nodes(edges)
    lines = dot_text.rstrip().splitlines()
    # insert styles before the closing brace
    insert_at = len(lines)
    for i in range(len(lines)-1, -1, -1):
        if lines[i].strip() == '}':
            insert_at = i
            break
    sty_lines = []
    sty_lines.append('  // === status annotations (auto-generated) ===')
    for n in sorted(nodes):
        if n == 'FIN':
            continue
        if not ID_PATTERN.fullmatch(n):
            continue
        st = status.get(n, 'pending')
        if st == 'done':
            cfg = style['done']
        elif st == 'in_progress':
            cfg = style['in_progress']
        elif n in ready:
            cfg = style['ready']
        else:
            cfg = style['blocked']
        attrs = ', '.join(f'{k}="{v}"' for k, v in cfg.items())
        sty_lines.append(f'  {n} [{attrs}];')
    # Put the status section in the dot
    new_lines = lines[:insert_at] + sty_lines + lines[insert_at:]
    return '\n'.join(new_lines) + ('\n' if not new_lines[-1].endswith('\n') else '')


def load_base_dot() -> str:
    if BASE_PRIMARY.exists():
        return BASE_PRIMARY.read_text()
    if BASE_FALLBACK.exists():
        return BASE_FALLBACK.read_text()
    raise SystemExit('adm.dot not found (expected adm.dot or development_flow/adm.dot)')


def strip_status_annotations(dot_text: str) -> str:
    """Strip previously auto-inserted status annotation blocks.

    Looks for lines starting with the marker comment and removes that line and any
    subsequent task node-style lines (e.g., "FB11 [style=..., ...];") until a line
    that does not look like a node-style line.
    """
    lines = dot_text.splitlines()
    out: List[str] = []
    skipping = False
    marker_re = re.compile(r"^\s*// === status annotations \(auto-generated\) ===\s*$")
    node_line_re = re.compile(r"^\s*(?:(?:FB|FL|RN)\d{2}|(?:CI|SEC|QA)\d{1,2})\s*\[.*\];\s*$")
    for line in lines:
        if marker_re.match(line):
            skipping = True
            continue
        if skipping:
            if node_line_re.match(line):
                continue
            # end of block
            skipping = False
        out.append(line)
    return "\n".join(out) + ("\n" if lines and not lines[-1].endswith("\n") else "")


def sanitize_graph_attrs(dot_text: str) -> str:
    """Work around Graphviz crashes with certain attr combos.

    Known issue: dot can segfault when using splines=ortho with concentrate=true
    on some versions/builds. To keep CI stable, disable concentrate in that case.
    """
    try:
        has_ortho = re.search(r"\bsplines\s*=\s*ortho\b", dot_text)
        has_conc_true = re.search(r"\bconcentrate\s*=\s*true\b", dot_text)
        if has_ortho and has_conc_true:
            dot_text = re.sub(r"\bconcentrate\s*=\s*true\b", "concentrate=false", dot_text)
    except Exception:
        # Best-effort; if anything goes wrong just return original text
        return dot_text
    return dot_text


def cmd_status():
    dot = load_base_dot()
    dot = sanitize_graph_attrs(dot)
    edges = parse_edges(dot)
    nodes = collect_nodes(edges)
    pred = predecessors(edges)
    status = load_status(nodes)
    ready = assignable(pred, status)
    # write colored dot
    OUT_DOT.parent.mkdir(parents=True, exist_ok=True)
    OUT_DOT.write_text(render_with_status(dot, status, set(ready)))
    print('Assignable tasks:')
    for n in ready:
        print('-', n)
    print(f'Wrote colored DOT: {OUT_DOT}')


def cmd_mark(task_id: str, new_status: str):
    if new_status not in ('pending', 'in_progress', 'done'):
        raise SystemExit('Status must be one of: pending, in_progress, done')
    dot = load_base_dot()
    dot = sanitize_graph_attrs(dot)
    edges = parse_edges(dot)
    nodes = collect_nodes(edges)
    status = load_status(nodes)
    if task_id not in status:
        raise SystemExit(f'Unknown task id: {task_id}')
    status[task_id] = new_status
    STATUS_JSON.write_text(json.dumps(status, ensure_ascii=False, indent=2))
    # recompute readiness and render
    pred = predecessors(edges)
    ready = assignable(pred, status)
    OUT_DOT.parent.mkdir(parents=True, exist_ok=True)
    OUT_DOT.write_text(render_with_status(dot, status, set(ready)))
    print(f'Updated {task_id} -> {new_status}')
    print(f'Wrote colored DOT: {OUT_DOT}')


def main():
    import sys
    if len(sys.argv) == 1:
        cmd_status()
        return
    cmd = sys.argv[1]
    if cmd == 'status':
        cmd_status()
    elif cmd == 'mark' and len(sys.argv) == 4:
        cmd_mark(sys.argv[2], sys.argv[3])
    else:
        print('Usage:')
        print('  python tools/taskflow.py status           # show assignable tasks and write development_flow/adm.dot')
        print('  python tools/taskflow.py mark <ID> <status>  # update status and rewrite DOT')
        print('    <status>: pending | in_progress | done')


if __name__ == '__main__':
    main()
