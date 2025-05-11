'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import locationData from '@/../public/data/vietnam_locations.json'; // Adjust path as needed

interface LocationSelectorProps {
  onSubmit: (locationString: string) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onSubmit }) => {
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const country = locationData.country || "Việt Nam"; // Default country

  const handleSubmit = () => {
    if (selectedProvince) {
      const locationString = `${selectedProvince}, ${country}`;
      onSubmit(locationString);
    }
    // Optionally add validation/feedback if nothing is selected
  };

  return (
    <Card className="w-full max-w-sm border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">Chọn vị trí của bạn</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="country-select" className="text-sm font-medium text-muted-foreground mb-1 block">Quốc gia</label>
          {/* Display country as text for now, could be a Select if more countries are added */}
          <div id="country-select" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            {country}
          </div>
        </div>
        <div>
          <label htmlFor="province-select" className="text-sm font-medium text-muted-foreground mb-1 block">Tỉnh/Thành phố</label>
          <Select value={selectedProvince} onValueChange={setSelectedProvince}>
            <SelectTrigger id="province-select" className="w-full">
              <SelectValue placeholder="Chọn tỉnh/thành phố..." />
            </SelectTrigger>
            <SelectContent>
              {locationData.provinces.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={!selectedProvince} className="w-full">
          Xác nhận vị trí
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LocationSelector;
