// src/components/AddSourceDialog.tsx
import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, Link as LinkIcon, X } from 'lucide-react'; // Added X icon

interface AddSourceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSourcesAdded: (sources: { files: File[], link: string }) => void; // Callback to pass data back
}

export function AddSourceDialog({ open, onOpenChange, onSourcesAdded }: AddSourceDialogProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [pastedLink, setPastedLink] = useState<string>('');
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const newFiles = Array.from(files);
            setSelectedFiles(prevFiles => [...prevFiles, ...newFiles]); // Allow multiple files
            // Clear the input value to allow selecting the same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const handleAddSources = () => {
        if (selectedFiles.length === 0 && !pastedLink) {
            toast({
                title: "Chưa có nguồn nào",
                description: "Vui lòng chọn file hoặc dán liên kết.",
                variant: "destructive",
            });
            return;
        }

        // Pass data back to parent component
        onSourcesAdded({ files: selectedFiles, link: pastedLink });

        // Show success toast
        let description = '';
        if (selectedFiles.length > 0) {
            description += `${selectedFiles.length} file(s) selected. `;
        }
        if (pastedLink) {
            description += `Link added.`;
        }
        toast({
            title: "Nguồn đã được thêm",
            description: description.trim(),
        });

        // Reset state and close dialog
        setSelectedFiles([]);
        setPastedLink('');
        onOpenChange(false); // Close the dialog
    };

    // --- Drag and Drop Handlers ---
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // Check if the leave target is outside the dropzone boundary
        if (e.currentTarget.contains(e.relatedTarget as Node)) {
            return; // Ignore if moving within the dropzone
        }
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true); // Keep highlighting while dragging over
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
             const newFiles = Array.from(files);
            setSelectedFiles(prevFiles => [...prevFiles, ...newFiles]);
            // Optionally clear the data transfer object (though usually handled by browser)
            // e.dataTransfer.clearData();
        }
    };
    // --- End Drag and Drop Handlers ---


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Thêm nguồn (Add Source)</DialogTitle>
                    <DialogDescription>
                        Tải lên tài liệu hoặc thêm liên kết web để làm ngữ cảnh cho cuộc trò chuyện.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="upload" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload"> <FileUp className="mr-2 h-4 w-4" /> Tải lên (Upload)</TabsTrigger>
                        <TabsTrigger value="link"> <LinkIcon className="mr-2 h-4 w-4" /> Liên kết (Link)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="mt-4 space-y-4">
                        {/* Drag and Drop Area */}
                        <div
                            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
                                isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <FileUp className="w-10 h-10 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Kéo thả file vào đây hoặc <span className="font-semibold text-primary">nhấn để chọn file</span>
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                multiple // Allow multiple file selection
                            />
                        </div>

                        {/* Selected Files List */}
                        {selectedFiles.length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                <Label>File đã chọn:</Label>
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                                        <span className="truncate flex-1 mr-2">{file.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleRemoveFile(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="link" className="mt-4 space-y-2">
                        <Label htmlFor="link-input">Dán liên kết web (Paste web link)</Label>
                        <Input
                            id="link-input"
                            type="url" // Use type="url" for basic validation
                            placeholder="https://example.com"
                            value={pastedLink}
                            onChange={(e) => setPastedLink(e.target.value)}
                        />
                    </TabsContent>
                </Tabs>
                <DialogFooter className="mt-6">
                    {/* DialogClose can be used for cancel */}
                    <DialogClose asChild>
                         <Button variant="outline">Hủy</Button>
                    </DialogClose>
                    <Button onClick={handleAddSources}>Thêm nguồn</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}