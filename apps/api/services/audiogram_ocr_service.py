"""
Audiogram OCR Service
Extracts hearing thresholds from audiogram images by detecting
red (right ear) and blue (left ear) markers at standard frequencies.
"""
import logging
from typing import Dict, Optional, Tuple, List
import numpy as np

logger = logging.getLogger(__name__)

# Standard audiometric frequencies in Hz
STANDARD_FREQUENCIES = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000]

# Typical audiogram chart layout ranges
DB_MIN = -10  # Top of chart
DB_MAX = 120  # Bottom of chart
FREQ_LOG_MIN = np.log10(125)
FREQ_LOG_MAX = np.log10(8000)


def extract_audiogram_thresholds(image_path: str) -> Dict:
    """
    Extract hearing thresholds from an audiogram image.
    
    Detects:
    - Red markers/lines with 'O' symbols → Right ear (air conduction)
    - Blue markers/lines with 'X' symbols → Left ear (air conduction)
    
    Returns dict with right_ear and left_ear threshold mappings.
    """
    try:
        import cv2
    except ImportError:
        logger.warning("OpenCV not available, falling back to basic analysis")
        return _fallback_extract(image_path)
    
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    height, width = img.shape[:2]
    
    # Detect the chart area (grid region)
    chart_bounds = _detect_chart_area(img)
    if chart_bounds is None:
        chart_bounds = (int(width * 0.05), int(height * 0.05), 
                       int(width * 0.95), int(height * 0.9))
    
    cx1, cy1, cx2, cy2 = chart_bounds
    chart_w = cx2 - cx1
    chart_h = cy2 - cy1
    
    # Detect red markers (right ear - O symbols)
    red_mask = _create_red_mask(hsv)
    red_points = _find_marker_positions(red_mask, chart_bounds)
    
    # Detect blue markers (left ear - X symbols) 
    blue_mask = _create_blue_mask(hsv)
    blue_points = _find_marker_positions(blue_mask, chart_bounds)
    
    # Convert pixel positions to frequency/dB values
    right_thresholds = _positions_to_thresholds(red_points, chart_bounds)
    left_thresholds = _positions_to_thresholds(blue_points, chart_bounds)
    
    # Round to nearest 5 dB (standard audiometric step)
    right_thresholds = {f: _round_to_5(db) for f, db in right_thresholds.items()}
    left_thresholds = {f: _round_to_5(db) for f, db in left_thresholds.items()}
    
    # Calculate confidence based on detection quality
    # Most audiograms have 7 frequencies per ear (125-8000, no 3000/6000)
    common_freq_count = 7
    total_expected = common_freq_count * 2
    total_detected = len(right_thresholds) + len(left_thresholds)
    confidence = min(0.95, total_detected / total_expected) if total_expected > 0 else 0
    
    return {
        'right_ear': right_thresholds,
        'left_ear': left_thresholds,
        'confidence': round(confidence, 3),
        'chart_bounds': list(chart_bounds),
        'detection_details': {
            'red_points_found': len(red_points),
            'blue_points_found': len(blue_points),
            'frequencies_detected_right': len(right_thresholds),
            'frequencies_detected_left': len(left_thresholds),
        }
    }


def _create_red_mask(hsv: np.ndarray) -> np.ndarray:
    """Create mask for red-colored markers."""
    import cv2
    # Red wraps around in HSV, so we need two ranges
    lower_red1 = np.array([0, 50, 50])
    upper_red1 = np.array([12, 255, 255])
    lower_red2 = np.array([155, 50, 50])
    upper_red2 = np.array([180, 255, 255])
    
    mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    mask = cv2.bitwise_or(mask1, mask2)
    
    # Clean up with morphological operations
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    return mask


def _create_blue_mask(hsv: np.ndarray) -> np.ndarray:
    """Create mask for blue-colored markers."""
    import cv2
    lower_blue = np.array([90, 50, 50])
    upper_blue = np.array([130, 255, 255])
    
    mask = cv2.inRange(hsv, lower_blue, upper_blue)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    return mask


def _detect_chart_area(img: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    """Detect the chart/grid area in the audiogram image."""
    import cv2
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Find grid lines
    edges = cv2.Canny(gray, 50, 150)
    
    # Find horizontal and vertical lines
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=80, 
                            minLineLength=img.shape[1]*0.2, maxLineGap=10)
    
    if lines is None or len(lines) < 4:
        return None
    
    h_lines = []
    v_lines = []
    
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = abs(np.arctan2(y2-y1, x2-x1) * 180 / np.pi)
        
        if angle < 15:  # Horizontal
            h_lines.append((x1, y1, x2, y2))
        elif angle > 75:  # Vertical
            v_lines.append((x1, y1, x2, y2))
    
    if len(h_lines) < 2 or len(v_lines) < 2:
        return None
    
    # Find bounding box of grid
    all_x = [x for l in h_lines + v_lines for x in [l[0], l[2]]]
    all_y = [y for l in h_lines + v_lines for y in [l[1], l[3]]]
    
    return (min(all_x), min(all_y), max(all_x), max(all_y))


def _find_marker_positions(mask: np.ndarray, 
                           chart_bounds: Tuple[int, int, int, int]) -> List[Tuple[int, int]]:
    """Find centers of marker blobs within chart area."""
    import cv2
    cx1, cy1, cx2, cy2 = chart_bounds
    
    # Crop mask to chart area
    chart_mask = mask[cy1:cy2, cx1:cx2]
    
    contours, _ = cv2.findContours(chart_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    points = []
    for contour in contours:
        area = cv2.contourArea(contour)
        # Filter by area - markers are typically 5-500 pixels
        if area < 5 or area > 2000:
            continue
        
        M = cv2.moments(contour)
        if M['m00'] == 0:
            continue
        
        # Center of contour (relative to chart area)
        cx = int(M['m10'] / M['m00']) + cx1
        cy = int(M['m01'] / M['m00']) + cy1
        
        points.append((cx, cy))
    
    return points


def _positions_to_thresholds(points: List[Tuple[int, int]], 
                             chart_bounds: Tuple[int, int, int, int]) -> Dict[int, int]:
    """Convert pixel positions to frequency/dB threshold values."""
    if not points:
        return {}
    
    cx1, cy1, cx2, cy2 = chart_bounds
    chart_w = cx2 - cx1
    chart_h = cy2 - cy1
    
    thresholds = {}
    
    for px, py in points:
        # X position → frequency (logarithmic scale)
        x_ratio = (px - cx1) / chart_w
        freq_log = FREQ_LOG_MIN + x_ratio * (FREQ_LOG_MAX - FREQ_LOG_MIN)
        freq = 10 ** freq_log
        
        # Y position → dB (linear scale, inverted - higher dB = lower on chart)
        y_ratio = (py - cy1) / chart_h
        db = DB_MIN + y_ratio * (DB_MAX - DB_MIN)
        
        # Snap to nearest standard frequency
        nearest_freq = min(STANDARD_FREQUENCIES, key=lambda f: abs(f - freq))
        
        # Accept if within half the log-distance to the next standard frequency
        nearest_idx = STANDARD_FREQUENCIES.index(nearest_freq)
        if nearest_idx > 0:
            left_dist = abs(np.log10(STANDARD_FREQUENCIES[nearest_idx]) - np.log10(STANDARD_FREQUENCIES[nearest_idx - 1]))
        else:
            left_dist = 1.0
        if nearest_idx < len(STANDARD_FREQUENCIES) - 1:
            right_dist = abs(np.log10(STANDARD_FREQUENCIES[nearest_idx + 1]) - np.log10(STANDARD_FREQUENCIES[nearest_idx]))
        else:
            right_dist = 1.0
        max_dist = max(left_dist, right_dist) * 0.55
        
        if abs(np.log10(nearest_freq) - freq_log) < max_dist:
            db_rounded = _round_to_5(round(db))
            # If multiple points map to same frequency, use average
            if nearest_freq in thresholds:
                thresholds[nearest_freq] = _round_to_5((thresholds[nearest_freq] + db_rounded) // 2)
            else:
                thresholds[nearest_freq] = db_rounded
    
    return thresholds


def _round_to_5(value: int) -> int:
    """Round to nearest 5 dB."""
    return round(value / 5) * 5


def _fallback_extract(image_path: str) -> Dict:
    """Fallback when OpenCV is not available - returns empty structure for manual input."""
    return {
        'right_ear': {},
        'left_ear': {},
        'confidence': 0,
        'chart_bounds': [],
        'detection_details': {
            'red_points_found': 0,
            'blue_points_found': 0,
            'frequencies_detected_right': 0,
            'frequencies_detected_left': 0,
            'fallback': True,
        }
    }


def validate_thresholds(thresholds: Dict[str, int]) -> Dict[str, int]:
    """Validate and normalize threshold values."""
    validated = {}
    for freq_str, db in thresholds.items():
        try:
            freq = int(freq_str)
            db_val = int(db)
        except (ValueError, TypeError):
            continue
        
        if freq not in STANDARD_FREQUENCIES:
            continue
        if db_val < DB_MIN or db_val > DB_MAX:
            continue
        
        validated[str(freq)] = _round_to_5(db_val)
    
    return validated
