#!/bin/sh
# 把镜像内的初始数据递归同步到volume（已有文件不覆盖，新增文件/目录补充进去）
sync_init() {
    src="$1"
    dst="$2"
    mkdir -p "$dst"
    for item in "$src"/*; do
        [ -e "$item" ] || continue
        name=$(basename "$item")
        if [ -d "$item" ]; then
            sync_init "$item" "$dst/$name"
        elif [ ! -f "$dst/$name" ]; then
            cp "$item" "$dst/$name"
            echo "初始化: $dst/$name"
        fi
    done
}

sync_init /app/data_init /app/data

exec python app.py
