import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Users, Info, Mail, Code } from "lucide-react";

export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: (i) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.1,
                duration: 0.5,
                ease: "easeOut"
            }
        })
    };

    const sectionVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: (i) => ({
            opacity: 1,
            x: 0,
            transition: {
                delay: i * 0.15,
                duration: 0.6,
                ease: "easeOut"
            }
        })
    };

    const teamMembers = [
        "Đào Sỹ Duy Minh",
        "Nguyễn Lâm Phú Quý",
        "Bàng Mỹ Linh",
        "Huỳnh Trung Kiệt",
        "Bá Thanh"
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 shadow-xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="relative"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600" />
                    
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                                <Info className="h-5 w-5 text-blue-500" />
                                Thông tin & Hỗ trợ
                            </DialogTitle>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <DialogDescription className="text-gray-600 dark:text-gray-300">
                                Thông tin về nhóm phát triển và hướng dẫn sử dụng ứng dụng.
                            </DialogDescription>
                        </motion.div>
                    </DialogHeader>

                    <div className="py-4 px-6">
                        <div className="space-y-6">
                            <motion.div 
                                custom={0}
                                initial="hidden"
                                animate="visible"
                                variants={sectionVariants}
                                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300"
                            >
                                <div className="flex items-start gap-3">
                                    <Code className="h-5 w-5 mt-1 text-blue-500 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white mb-1">Team</h3>
                                        <p className="text-gray-700 dark:text-gray-300">404 Brain Not Found</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div 
                                custom={1}
                                initial="hidden"
                                animate="visible"
                                variants={sectionVariants}
                                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300"
                            >
                                <div className="flex items-start gap-3">
                                    <Users className="h-5 w-5 mt-1 text-blue-500 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Thành Viên</h3>
                                        <ul className="space-y-1">
                                            {teamMembers.map((member, index) => (
                                                <motion.li 
                                                    key={index}
                                                    custom={index}
                                                    initial="hidden"
                                                    animate="visible"
                                                    variants={fadeIn}
                                                    className="text-gray-700 dark:text-gray-300 flex items-center"
                                                >
                                                    <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                    {member}
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div 
                                custom={2}
                                initial="hidden"
                                animate="visible"
                                variants={sectionVariants}
                                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300"
                            >
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 mt-1 text-blue-500 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white mb-1">Hướng dẫn</h3>
                                        <p className="text-gray-700 dark:text-gray-300">
                                            Để sử dụng ứng dụng, hãy nhập thông tin sức khỏe của bạn và chọn các tùy chọn thực đơn.
                                            Bạn có thể tùy chỉnh các tùy chọn này theo sở thích cá nhân.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div 
                                custom={3}
                                initial="hidden"
                                animate="visible"
                                variants={sectionVariants}
                                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300"
                            >
                                <div className="flex items-start gap-3">
                                    <Mail className="h-5 w-5 mt-1 text-blue-500 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white mb-1">Hỗ trợ</h3>
                                        <p className="text-gray-700 dark:text-gray-300">
                                            Liên hệ qua email: <a href="mailto:duyminh12122005@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline transition-all">duyminh12122005@gmail.com</a>
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 1 }}
                            className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400"
                        >
                            © 2025 404 Brain Not Found. All rights reserved.
                        </motion.div>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}