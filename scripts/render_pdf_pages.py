from __future__ import annotations

import argparse
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw


def main(source: Path, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    document = pdfium.PdfDocument(source)
    rendered: list[Image.Image] = []
    for index in range(len(document)):
        page = document[index]
        image = page.render(scale=1.35).to_pil().convert('RGB')
        image.save(output / f'page-{index + 1:02d}.png')
        rendered.append(image)

    thumb_width = 250
    margin = 16
    columns = 3
    thumb_height = int(rendered[0].height * thumb_width / rendered[0].width)
    rows_per_sheet = 6
    for sheet_index in range(0, len(rendered), columns * rows_per_sheet):
        group = rendered[sheet_index:sheet_index + columns * rows_per_sheet]
        rows = (len(group) + columns - 1) // columns
        sheet = Image.new('RGB', (columns * (thumb_width + margin) + margin, rows * (thumb_height + 34 + margin) + margin), 'white')
        draw = ImageDraw.Draw(sheet)
        for offset, image in enumerate(group):
            column = offset % columns
            row = offset // columns
            x = margin + column * (thumb_width + margin)
            y = margin + row * (thumb_height + 34 + margin)
            thumbnail = image.resize((thumb_width, thumb_height))
            sheet.paste(thumbnail, (x, y + 22))
            draw.text((x, y), f'Page {sheet_index + offset + 1}', fill='black')
        sheet.save(output / f'contact-{sheet_index // (columns * rows_per_sheet) + 1}.png')
    print(f'Rendered {len(rendered)} pages to {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    arguments = parser.parse_args()
    main(arguments.source, arguments.output)
