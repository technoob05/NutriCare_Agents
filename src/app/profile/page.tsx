'use client';

import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from "@/components/ui/button";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {LogOut, Settings, UserCircle} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {HealthInformationForm} from '@/components/HealthInformationForm';
import {SettingsDialogContent, SpeechSettings} from '@/components/SettingsDialogContent';
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    const router = useRouter();
    const {toast} = useToast();
    const [user, setUser] = useState<any>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        const currentUser = localStorage.getItem("currentUser");
        if (!currentUser) {
            router.push("/auth/login");
            return;
        }

        try {
            const userData = JSON.parse(currentUser);
            setUser(userData);
        } catch (error) {
            console.error("Error parsing user from localStorage:", error);
            localStorage.removeItem("currentUser");
            router.push("/auth/login");
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("currentUser");
        toast({
            title: "Thông báo",
            description: "Đăng xuất thành công.",
        });
        router.push("/auth/login");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="space-y-4">
                <Avatar className="h-24 w-24 ring-4 ring-background shadow-md">
                    {user?.name ? (
                        <AvatarImage src="https://picsum.photos/200/200" alt={user.name}/>
                    ) : (
                        <AvatarFallback>
                            {user?.name ? user.name[0].toUpperCase() : '?'}
                        </AvatarFallback>
                    )}
                </Avatar>
                <div className="text-center">
                    <h1 className="text-3xl font-semibold">{user?.name || 'Người dùng'}</h1>
                    <p className="text-muted-foreground">{user?.email || 'Không có email'}</p>
                </div>
            </div>

            <div className="mt-8 space-y-4">
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-center">
                            <Settings className="mr-2 h-4 w-4"/>
                            Cài đặt
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Cài đặt (Settings)</DialogTitle>
                            <DialogDescription>
                                Quản lý thông tin sức khỏe và cấu hình AI của bạn.
                            </DialogDescription>
                        </DialogHeader>
                        <Tabs defaultValue="ai-config" className="mt-4">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="ai-config">Cấu hình AI</TabsTrigger>
                                <TabsTrigger value="health-info">Thông tin sức khỏe</TabsTrigger>
                                <TabsTrigger value="speech">Speech</TabsTrigger>
                            </TabsList>
                            <TabsContent value="ai-config" className="mt-4">
                                <SettingsDialogContent/>
                            </TabsContent>
                            <TabsContent value="health-info" className="mt-4">
                                <HealthInformationForm/>
                            </TabsContent>
                            <TabsContent value="speech" className="mt-4">
                                <SpeechSettings/>
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>

                <Button variant="destructive" onClick={handleLogout} className="w-full justify-center">
                    <LogOut className="mr-2 h-4 w-4"/>
                    Đăng xuất
                </Button>
            </div>
        </div>
    );
}
