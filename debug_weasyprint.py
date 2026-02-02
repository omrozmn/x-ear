import sys
try:
    from weasyprint import HTML
    print("WeasyPrint imported successfully!")
except Exception as e:
    print(f"WeasyPrint import failed: {e}")
    import traceback
    traceback.print_exc()
