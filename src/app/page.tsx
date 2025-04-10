'use client';

import React, { Suspense } from 'react';

const DynamicHomePage = React.lazy(() => import('@/components/HomePage'));

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <DynamicHomePage />
    </Suspense>
  );
}
