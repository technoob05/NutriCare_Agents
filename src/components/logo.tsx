import React from 'react';
import { Utensils } from 'lucide-react'; // Example icon

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  // Replace with your actual SVG logo or component if you have one
  return (
    <Utensils className="h-full w-full text-primary" {...props} />
  );
}
