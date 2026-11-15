# sheet.py <dir> [glob]: contact sheet of the frames in a folder
import glob
import sys

from PIL import Image

d = sys.argv[1]
pat = sys.argv[2] if len(sys.argv) > 2 else 'move_*.jpg'
fs = sorted(glob.glob(f'{d}/{pat}'))
ims = [Image.open(f).convert('RGB') for f in fs]
w, h = 480, int(480 * ims[0].height / ims[0].width)
cols = 4
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), 'black')
for i, im in enumerate(ims):
    sheet.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
sheet.save(f'{d}/sheet.jpg', quality=85)
print(len(fs))
