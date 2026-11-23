import '../ui/index.css';

export const metadata = {
  title: 'Tusmaal — Online Courses',
  description: 'Tusmaal e-learning. Practical courses, live classes, quizzes, and certificates.',
  applicationName: 'Tusmaal',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#15184b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="icon" href="/ResourcesPhotos/tusmaal.png" type="image/png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
