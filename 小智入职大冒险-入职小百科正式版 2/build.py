#!/usr/bin/env python3
"""把多文件版游戏打包成单文件 HTML。

用法：
    python3 build.py

产出（dist/ 目录）：
    小智入职大冒险-单文件版.html   可直接双击打开、可作为附件转发的完整页面
    artifact-page.html            仅含 body 内容的片段，用于发布到在线页面平台

打包规则：CSS、JS 内联，图片转为 data URI，不产生任何外部请求。
"""

import base64
import mimetypes
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
SCRIPTS = ["content.js", "advanced-content.js", "game.js"]


def data_uri(rel_path: str) -> str:
    path = ROOT / rel_path
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    payload = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{payload}"


def inline_images(html: str) -> str:
    def replace(match):
        src = match.group(1)
        if src.startswith(("data:", "http:", "https:")):
            return match.group(0)
        return f'src="{data_uri(src)}"'

    return re.sub(r'src="([^"]+)"', replace, html)


def build():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "style.css").read_text(encoding="utf-8")
    js = "\n\n".join((ROOT / name).read_text(encoding="utf-8") for name in SCRIPTS)

    title = re.search(r"<title>(.*?)</title>", html, re.S).group(1).strip()
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    body = re.sub(r'\s*<script src="[^"]+"></script>', "", body)
    body = inline_images(body).strip()

    DIST.mkdir(exist_ok=True)

    fragment = "\n".join([
        f"<title>{title}</title>",
        "<style>",
        css.strip(),
        "</style>",
        body,
        "<script>",
        js.strip(),
        "</script>",
        "",
    ])
    (DIST / "artifact-page.html").write_text(fragment, encoding="utf-8")

    standalone = "\n".join([
        "<!doctype html>",
        '<html lang="zh-CN">',
        "<head>",
        '<meta charset="UTF-8" />',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        '<meta name="theme-color" content="#07339f" />',
        f"<title>{title}</title>",
        "<style>",
        css.strip(),
        "</style>",
        "</head>",
        "<body>",
        body,
        "<script>",
        js.strip(),
        "</script>",
        "</body>",
        "</html>",
        "",
    ])
    out = DIST / "小智入职大冒险-单文件版.html"
    out.write_text(standalone, encoding="utf-8")

    for f in (out, DIST / "artifact-page.html"):
        print(f"{f.name}: {f.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    build()
