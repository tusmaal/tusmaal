'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../ui/App'), {
  ssr: false,
  loading: () => (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  ),
});

export default function ClientApp() {
  return <App />;
}
