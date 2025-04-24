import React from 'react';
import Link from 'next/link'; // Import Link
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Users, Info, Mail, Code, ChevronRight, Star, Sparkles } from "lucide-react";

export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    // Enhanced animations
    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({ // Add type number to i
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.08,
                duration: 0.4,
                ease: "easeOut"
            }
        })
    };

    const sectionVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: (i: number) => ({ // Add type number to i
            opacity: 1,
            x: 0,
            transition: {
                delay: i * 0.12,
                duration: 0.5,
                ease: "easeOut"
            }
        })
    };

    const glowEffect = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.5
            }
        }
    };

    const teamMembers = [
        { name: "Đào Sỹ Duy Minh", role: "Team Lead" },
        { name: "Nguyễn Lâm Phú Quý", role: "Designer" },
        { name: "Bàng Mỹ Linh", role: "Developer" },
        { name: "Huỳnh Trung Kiệt", role: "Developer" },
        { name: "Bá Thanh", role: "QA Engineer" }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-gradient-to-br from-gray-950 to-gray-900 dark:from-gray-950 dark:to-black shadow-xl border border-gray-800 rounded-xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="relative"
                >
                    {/* Glowing accent border */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-600 to-cyan-400" />

                    {/* Animated accent corners */}
                    <motion.div
                        className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400 rounded-tl-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    />
                    <motion.div
                        className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-500 rounded-tr-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    />
                    <motion.div
                        className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    />
                    <motion.div
                        className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500 rounded-br-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    />

                    {/* Subtle background pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(#224488_1px,transparent_1px)] dark:bg-[radial-gradient(#224477_1px,transparent_1px)] [background-size:20px_20px] opacity-5 z-0" />

                    <DialogHeader className="px-8 pt-8 pb-2 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="flex items-center gap-3"
                        >
                            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <Sparkles className="h-6 w-6 text-blue-400" />
                            </div>
                            <DialogTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                Thông tin & Hỗ trợ
                                <motion.span
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
                                    className="inline-flex items-center px-2 py-0.5 ml-2 text-xs font-medium rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                >
                                    v2.0
                                </motion.span>
                            </DialogTitle>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <DialogDescription className="text-gray-300 mt-2 ml-12">
                                Thông tin về nhóm phát triển và hướng dẫn sử dụng ứng dụng hiện đại.
                            </DialogDescription>
                        </motion.div>
                    </DialogHeader>

                    <div className="py-6 px-8 relative z-10">
                        <div className="space-y-5">
                            <motion.div
                                custom={0}
                                initial="hidden"
                                animate="visible"
                                variants={sectionVariants}
                                className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700/50 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-blue-900/30 rounded-lg border border-blue-800/50">
                                        <Code className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-medium text-white mb-1 text-lg">Team</h3>
                                            <motion.div
                                                variants={glowEffect}
                                                className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-300 border border-blue-500/30"
                                            >
                                                Innovative
                                            </motion.div>
                                        </div>
                                        <p className="text-blue-200 font-semibold">404 Brain Not Found</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                custom={1}
                                initial="hidden"
                                animate="visible"
                                variants={sectionVariants}
                                className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700/50 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-purple-900/30 rounded-lg border border-purple-800/50">
                                        <Users className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-medium text-white mb-2 text-lg">Thành Viên</h3>
                                            <motion.div
                                                variants={glowEffect}
                                                className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 border border-purple-500/30"
                                            >
                                                Pro Team
                                            </motion.div>
                                        </div>
                                        <ul className="space-y-2 mt-3">
                                            {teamMembers.map((member, index) => (
                                                <motion.li
                                                    key={index}
                                                    custom={index}
                                                    initial="hidden"
                                                    animate="visible"
                                                    variants={fadeIn}
                                                    className="text-gray-100 flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center">
                                                        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"></span>
                                                        {member.name}
                                                    </div>
                                                    <span className="text-xs text-gray-400 group-hover:text-purple-300 transition-colors">
                                                        {member.role}
                                                    </span>
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
                                className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700/50 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-cyan-900/30 rounded-lg border border-cyan-800/50">
                                        <Info className="h-5 w-5 text-cyan-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-medium text-white mb-1 text-lg">Hướng dẫn</h3>
                                            <motion.div
                                                variants={glowEffect}
                                                className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-300 border border-cyan-500/30"
                                            >
                                                Tech Tips
                                            </motion.div>
                                        </div>
                                        <p className="text-gray-300">
                                            Để sử dụng ứng dụng, hãy nhập thông tin sức khỏe của bạn và chọn các tùy chọn thực đơn.
                                            Bạn có thể tùy chỉnh các tùy chọn này theo sở thích cá nhân.
                                        </p>
                                        <Link href="/help" passHref>
                                            <div className="mt-3 flex items-center text-cyan-400 text-sm font-medium cursor-pointer hover:text-cyan-300 transition-colors group">
                                                Xem thêm
                                                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                custom={3}
                                initial="hidden"
                                animate="visible"
                                variants={sectionVariants}
                                className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700/50 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-green-900/30 rounded-lg border border-green-800/50">
                                        <Mail className="h-5 w-5 text-green-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-medium text-white mb-1 text-lg">Hỗ trợ</h3>
                                            <motion.div
                                                variants={glowEffect}
                                                className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-600/20 to-teal-600/20 text-green-300 border border-green-500/30"
                                            >
                                                24/7
                                            </motion.div>
                                        </div>
                                        <p className="text-gray-300">
                                            Liên hệ qua email:
                                        </p>
                                        <a
                                            href="mailto:duyminh12122005@gmail.com"
                                            className="mt-1 inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-green-900/40 to-teal-900/40 text-green-300 border border-green-700/50 hover:border-green-500/50 hover:text-green-200 transition-all"
                                        >
                                            duyminh12122005@gmail.com
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 1 }}
                            className="mt-6 pt-4 border-t border-gray-800 text-center"
                        >
                            <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                                <Star className="h-3 w-3 text-blue-400" />
                                <span className="text-gray-400">© 2025</span>
                                <span className="text-blue-400 font-medium">404 Brain Not Found</span>
                                <span className="text-gray-400">All rights reserved.</span>
                                <Star className="h-3 w-3 text-blue-400" />
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}
