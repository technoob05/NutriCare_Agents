import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InlineChatInputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
}

export function InlineChatInput({ onSubmit, placeholder = "Nhập tên của bạn..." }: InlineChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-background"
      />
      <Button type="submit" size="sm">
        Gửi
      </Button>
    </form>
  );
}
