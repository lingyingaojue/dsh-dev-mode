# -*- coding: utf-8 -*-
"""程序入口。--selftest 只加载 core，不打开界面，便于自动验收。"""
from __future__ import annotations

import argparse
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description="记账小工具")
    parser.add_argument("--selftest", action="store_true", help="不打开界面，跑一遍数据自测")
    args = parser.parse_args()

    if args.selftest:
        from core import selftest

        return selftest()

    import core
    import ui

    core.init_db()
    core.backup_db("startup")
    ui.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
