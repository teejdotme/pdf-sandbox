for img in output-*.png; do
    tesseract "$img" "${img%.png}" hocr
done