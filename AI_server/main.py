from fastapi import FastAPI, File, UploadFile, Form
from pydantic import BaseModel
from PIL import Image
import torch
from transformers import AutoImageProcessor, AutoModel, pipeline, set_seed
from dotenv import load_dotenv
import os
import io
from typing import Optional
import cv2
import numpy as np
import logging

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("ai_server.log"),
        logging.StreamHandler() # コンソールにも出力
    ]
)


# .envファイルから環境変数を読み込む
load_dotenv()

app = FastAPI()

# Hugging Faceモデルの準備
# 環境変数からモデルIDを取得、なければデフォルト値を使用
MODEL_ID = os.getenv("MODEL_ID", "facebook/dinov2-base")
try:
    logging.info(f"Loading image processor from {MODEL_ID}...")
    processor = AutoImageProcessor.from_pretrained(MODEL_ID)
    logging.info(f"Loading model from {MODEL_ID}...")
    model = AutoModel.from_pretrained(MODEL_ID)
    logging.info("Embedding model loaded successfully.")
except Exception as e:
    logging.error(f"Failed to load embedding model: {e}", exc_info=True)
    raise

# テキスト生成パイプラインの準備 (日本語GPT-2モデル)
# モデルのロードには時間がかかるため、サーバー起動時に一度だけ実行
# 本番環境ではより高性能なモデルや専用の推論サービスを検討してください
try:
    logging.info("Loading proposal generator model...")
    proposal_generator = pipeline('text-generation', model='rinna/japanese-gpt2-medium')
    logging.info("Proposal generator model loaded successfully.")
except Exception as e:
    logging.error(f"Failed to load proposal generator model: {e}", exc_info=True)
    raise

set_seed(42) # 再現性のためのシード設定

# OpenCVのHaar Cascade分類器をロード (顔検出用)
# このファイルはライブラリに同梱されているものを使用
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')


class ProposalRequest(BaseModel):
    prompt: str

class AIProposal(BaseModel):
    title: str
    description: str

class FaceDetectionBox(BaseModel):
    box: list[int] # [x, y, w, h]

class FaceDetectionResponse(BaseModel):
    faces: list[FaceDetectionBox]


@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/detect-faces", response_model=FaceDetectionResponse)
async def detect_faces_endpoint(file: UploadFile = File(...)):
    """
    アップロードされた画像から顔を検出し、バウンディングボックスを返すAPI
    """
    logging.info("[/detect-faces] Received request.")
    try:
        image_data = await file.read()
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 顔検出の実行
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        logging.info(f"[/detect-faces] Found {len(faces)} faces.")
        return FaceDetectionResponse(faces=[{"box": face.tolist()} for face in faces])
    except Exception as e:
        logging.error(f"[/detect-faces] Error processing request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@app.post("/embedding")
async def create_embedding(
    file: UploadFile = File(...),
    box: Optional[str] = Form(None), # JSON文字列として bounding box を受け取る e.g., '[x, y, w, h]'
):
    """
    画像からエンベディングを生成する。オプションで顔の領域(box)を指定可能。
    """
    logging.info(f"[/embedding] Received request. Box: {box}")
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # boxが指定されていれば、画像を切り抜く
        if box:
            import json
            try:
                x, y, w, h = json.loads(box)
                image = image.crop((x, y, x + w, y + h))
                logging.info(f"[/embedding] Cropped image to box: {[x, y, w, h]}")
            except (json.JSONDecodeError, ValueError):
                logging.warning(f"[/embedding] Invalid box format: {box}. Using full image.")
                pass

        # モデルでエンベディングを生成
        with torch.no_grad():
            inputs = processor(images=image, return_tensors="pt")
            outputs = model(**inputs)
            embedding = outputs.last_hidden_state[:, 0].squeeze().tolist()
        
        logging.info("[/embedding] Successfully generated embedding.")
        return {"embedding": embedding}
    except Exception as e:
        logging.error(f"[/embedding] Error processing request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@app.post("/generate-proposal", response_model=AIProposal)
async def generate_proposal_endpoint(request: ProposalRequest):
    """
    プロンプトに基づいてAIが提案のアイデアを文章で生成する
    """
    logging.info(f"[/generate-proposal] Received request with prompt: {request.prompt}")
    try:
        # モデルが生成しやすいようにプロンプトを整形
        full_prompt = f"新しい提案を考えてください。テーマは「{request.prompt}」です。\n提案のタイトル："

        # テキスト生成の実行
        generated_outputs = proposal_generator(
            full_prompt,
            max_length=100, # 生成するテキストの最大長
            num_return_sequences=1,
            do_sample=True,
            top_k=50,
            top_p=0.95,
            temperature=0.8,
        )
        generated_text = generated_outputs[0]['generated_text']
        logging.info(f"[/generate-proposal] Generated text: {generated_text}")

        # 生成されたテキストからタイトルと本文を雑に抽出
        # 最初の改行までをタイトル、それ以降を説明文とみなす
        try:
            title_part, description_part = generated_text.split("\n", 1)
            title = title_part.replace("提案のタイトル：", "").strip()
            description = description_part.strip()
        except ValueError:
            title = generated_text.replace("提案のタイトル：", "").strip()
            description = ""
        
        logging.info(f"[/generate-proposal] Parsed title: {title}")
        return AIProposal(title=title, description=description)
    except Exception as e:
        logging.error(f"[/generate-proposal] Error processing request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")
