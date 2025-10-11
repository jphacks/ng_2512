import argparse
import socket
import time
from typing import Sequence, Tuple


def wait_for_endpoints(endpoints: Sequence[Tuple[str, int]], timeout: float, interval: float) -> None:
    deadline = time.monotonic() + timeout
    pending = list(endpoints)
    while pending and time.monotonic() < deadline:
        remaining = []
        for host, port in pending:
            try:
                with socket.create_connection((host, port), timeout=interval):
                    continue
            except OSError:
                remaining.append((host, port))
        pending = remaining
        if pending:
            time.sleep(interval)
    if pending:
        raise SystemExit(f"Timed out waiting for services: {pending}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Wait for TCP services to become reachable.")
    parser.add_argument("--host", dest="hosts", action="append", required=True, help="Hostname to check.")
    parser.add_argument("--port", dest="ports", action="append", type=int, required=True, help="Port for preceding --host.")
    parser.add_argument("--timeout", type=float, default=60.0, help="Overall timeout in seconds.")
    parser.add_argument("--interval", type=float, default=1.5, help="Retry interval in seconds.")
    args = parser.parse_args()
    if len(args.hosts) != len(args.ports):
        raise SystemExit("Number of --host entries must match number of --port entries.")
    return args


def main() -> None:
    args = parse_args()
    pairs = list(zip(args.hosts, args.ports))
    wait_for_endpoints(pairs, timeout=args.timeout, interval=args.interval)


if __name__ == "__main__":
    main()
