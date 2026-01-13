"""
Simple document scanner / cropper adapted from common OpenCV techniques
(compatible with OpenCV-Document-Scanner approach). This module exposes a
single `auto_crop_image(input_path)` function that returns the path to a
temporary cropped image (same format as input) or None on failure.

The implementation uses OpenCV (already required by the project) and does
not require the external repository to be added; it is a lightweight
adaptation aimed at reliably cropping typical SGK documents before OCR.
"""
import cv2
import numpy as np
import os
import tempfile


def _order_points(pts):
    # Order points as top-left, top-right, bottom-right, bottom-left
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]

    return rect


def four_point_transform(image, pts):
    rect = _order_points(pts)
    (tl, tr, br, bl) = rect

    # Compute width of the new image
    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = max(int(widthA), int(widthB))

    # Compute height of the new image
    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = max(int(heightA), int(heightB))

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))

    return warped


def auto_crop_image(input_path):
    try:
        if not os.path.exists(input_path):
            return None

        image = cv2.imread(input_path)
        if image is None:
            return None

        orig = image.copy()
        ratio = image.shape[0] / 500.0
        image = cv2.resize(image, (int(image.shape[1] / ratio), 500))

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(gray, 75, 200)

        cnts, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:10]

        screenCnt = None
        for c in cnts:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                screenCnt = approx
                break

        if screenCnt is None:
            # Could not find a 4-point contour; fall back to bounding rect of largest contour
            if len(cnts) == 0:
                return None
            x, y, w, h = cv2.boundingRect(cnts[0])
            cropped = orig[int(y * ratio):int((y + h) * ratio), int(x * ratio):int((x + w) * ratio)]
        else:
            pts = screenCnt.reshape(4, 2) * ratio
            warped = four_point_transform(orig, pts)
            cropped = warped

        # Save to temp file (preserve extension)
        base, ext = os.path.splitext(os.path.basename(input_path))
        fd, out_path = tempfile.mkstemp(prefix=f"crop_{base}_", suffix=ext)
        os.close(fd)
        # Write with reasonable JPEG quality if saving as jpg
        if ext.lower() in ['.jpg', '.jpeg']:
            cv2.imwrite(out_path, cropped, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        else:
            cv2.imwrite(out_path, cropped)

        return out_path

    except Exception:
        return None
