/**
 * Field positions for certificate-template (1024 × 581).
 * Coordinates use top-left origin (y increases downward).
 */
const PAGE = { width: 1024, height: 581 };

const layout = {
  page: PAGE,
  // White masks cover sample text on the template image
  masks: [
    { x: 72, y: 222, w: 880, h: 54 },   // student name
    { x: 88, y: 286, w: 848, h: 42 },   // course line
    { x: 92, y: 344, w: 268, h: 36 },   // date value
    { x: 648, y: 344, w: 310, h: 36 },  // serial value
    { x: 54, y: 454, w: 108, h: 112 },  // QR code
  ],
  name: { y: 252, size: 26, color: 'teal' },
  course: { y: 304, size: 11.5, color: 'navy', maxWidth: 780 },
  date: { x: 226, y: 362, size: 12, color: 'navy' },
  serial: { x: 956, y: 362, size: 11, color: 'navy', align: 'right' },
  qr: { x: 68, y: 468, size: 88 },
};

module.exports = { layout, PAGE };
