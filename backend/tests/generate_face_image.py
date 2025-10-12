from PIL import Image, ImageDraw

def create_face_image(path: str):
    """Creates a simple image with a face-like pattern."""
    img = Image.new('RGB', (100, 100), color = 'white')
    draw = ImageDraw.Draw(img)
    # Draw a simple face
    draw.ellipse((20, 20, 80, 80), fill='yellow', outline='black') # Head
    draw.ellipse((35, 40, 45, 50), fill='black') # Left eye
    draw.ellipse((55, 40, 65, 50), fill='black') # Right eye
    draw.arc((30, 50, 70, 70), 0, 180, fill='black') # Mouth
    img.save(path)

if __name__ == "__main__":
    create_face_image("/Users/kotama/workplace/Prototype/ng_2512/backend/tests/assets/face.jpg")
