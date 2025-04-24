'use client'; // Required for framer-motion and other client-side hooks

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Home,
    User,
    Camera,
    ShoppingBasket,
    MessageSquare,
    Mic,
    HelpCircle,
    Settings,
    MapPin,
    BrainCircuit, // Icon for Understand Meal
    Image as ImageIcon // Placeholder for images
} from 'lucide-react';
import { MainNav } from '@/components/main-nav'; // Add this import

// Animation variants
const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5 } },
};

const sectionVariants = {
    initial: { opacity: 0, y: 20 },
    animate: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
    }),
};

const iconVariants = {
    hover: { scale: 1.1, rotate: 5 },
    tap: { scale: 0.95 }
};

export default function HelpPage() {
    const features = [
        {
            value: "item-1",
            title: "Bắt đầu & Thiết lập Hồ sơ",
            icon: User,
            content: [
                { type: 'paragraph', text: "Để ứng dụng hoạt động hiệu quả nhất, hãy bắt đầu bằng cách cung cấp một số thông tin cơ bản." },
                { type: 'strong', text: "Nhập thông tin sức khỏe:" },
                { type: 'paragraph', text: "Điều hướng đến trang 'Cài đặt' (biểu tượng bánh răng <Settings className='inline h-4 w-4 text-blue-500' /> trong sidebar) -> 'Thông tin sức khỏe'. Nhập chiều cao, cân nặng, tuổi, giới tính, và mức độ hoạt động. Thông tin này rất quan trọng để cá nhân hóa các đề xuất dinh dưỡng và theo dõi tiến trình của bạn." },
                { type: 'strong', text: "Thiết lập sở thích ăn uống:" },
                { type: 'paragraph', text: "Cũng trong phần 'Thông tin sức khỏe', bạn có thể chỉ định các sở thích ăn uống (ví dụ: ăn chay, keto), dị ứng thực phẩm, hoặc các loại thực phẩm bạn muốn tránh. Điều này giúp AI gợi ý các bữa ăn phù hợp hơn." },
                { type: 'image_placeholder', text: "Ảnh chụp màn hình trang cài đặt thông tin sức khỏe." }
            ]
        },
        {
            value: "item-2",
            title: "Nhận diện bữa ăn (Recognize Meal)",
            icon: Camera,
            content: [
                { type: 'paragraph', text: "Chụp ảnh hoặc tải lên hình ảnh bữa ăn của bạn để nhận phân tích dinh dưỡng tức thì." },
                { type: 'strong', text: "Cách sử dụng:" },
                { type: 'list', items: [
                    "Truy cập trang 'Nhận diện món ăn' (<Camera className='inline h-4 w-4 text-green-500' /> từ sidebar).",
                    "Nhấp vào nút 'Tải ảnh lên' hoặc sử dụng camera tích hợp.",
                    "AI sẽ phân tích hình ảnh, xác định các món ăn và ước tính thông tin dinh dưỡng (calo, protein, carb, fat).",
                    "Bạn cũng có thể nhận được gợi ý công thức nấu ăn tương tự hoặc các lựa chọn thay thế lành mạnh hơn."
                ]},
                { type: 'image_placeholder', text: "Ảnh minh họa quá trình nhận diện bữa ăn và kết quả." }
            ]
        },
        {
            value: "item-7", // New item
            title: "Hiểu về bữa ăn (Understand Meal)",
            icon: BrainCircuit,
            content: [
                { type: 'paragraph', text: "Sau khi nhận diện bữa ăn, bạn có thể tìm hiểu sâu hơn về các thành phần và lợi ích sức khỏe." },
                { type: 'strong', text: "Cách sử dụng:" },
                { type: 'list', items: [
                    "Sau khi có kết quả từ 'Nhận diện bữa ăn', tìm nút hoặc tùy chọn 'Hiểu thêm về bữa ăn này'.",
                    "AI sẽ cung cấp thông tin chi tiết hơn về các thành phần chính, lợi ích/tác hại tiềm ẩn, và so sánh với các mục tiêu dinh dưỡng của bạn.",
                    "Bạn có thể đặt câu hỏi tiếp theo như 'Món này có phù hợp với người tiểu đường không?'."
                ]},
                { type: 'image_placeholder', text: "Ảnh chụp màn hình hiển thị thông tin chi tiết sau khi 'Hiểu về bữa ăn'." }
            ]
        },
        {
            value: "item-3",
            title: "Theo dõi tủ đựng thức ăn (Pantry Tracker)",
            icon: ShoppingBasket,
            content: [
                { type: 'paragraph', text: "Quản lý các nguyên liệu bạn có sẵn trong bếp để tránh lãng phí và nhận gợi ý công thức." },
                { type: 'strong', text: "Cách sử dụng:" },
                { type: 'list', items: [
                    "Truy cập trang 'Pantry Tracker' (hiện chưa có link trực tiếp từ sidebar, có thể truy cập qua URL /pantry-tracker).",
                    "Thêm các nguyên liệu bạn đang có, bao gồm tên và số lượng (ví dụ: trứng, 5 quả; sữa, 1 lít).",
                    "Cập nhật khi bạn sử dụng hết hoặc mua thêm nguyên liệu.",
                    "Sử dụng tính năng 'Gợi ý công thức' dựa trên nguyên liệu có sẵn trong tủ."
                ]},
                 { type: 'image_placeholder', text: "Giao diện quản lý Pantry Tracker." }
            ]
        },
        {
            value: "item-4",
            title: "Trò chuyện với AI (Chat)",
            icon: MessageSquare,
            content: [
                { type: 'paragraph', text: "Tương tác trực tiếp với trợ lý AI để đặt câu hỏi, nhận lời khuyên dinh dưỡng, hoặc lên kế hoạch bữa ăn." },
                { type: 'strong', text: "Cách sử dụng:" },
                { type: 'list', items: [
                    "Nhấp vào 'Cuộc trò chuyện mới' hoặc chọn một cuộc trò chuyện cũ từ sidebar.",
                    "Nhập câu hỏi hoặc yêu cầu của bạn vào ô chat (ví dụ: 'Gợi ý bữa tối ít calo và giàu protein', 'Làm thế nào để nấu món phở gà?', 'So sánh dinh dưỡng giữa gạo trắng và gạo lứt').",
                    "AI sẽ trả lời dựa trên kiến thức dinh dưỡng, thông tin hồ sơ của bạn và ngữ cảnh cuộc trò chuyện."
                ]},
                { type: 'image_placeholder', text: "Ví dụ về một cuộc trò chuyện với AI." }
            ]
        },
        {
            value: "item-6",
            title: "Tương tác bằng giọng nói (Voice)",
            icon: Mic,
            content: [
                { type: 'paragraph', text: "Sử dụng giọng nói để điều khiển ứng dụng và nhận phản hồi âm thanh." },
                { type: 'strong', text: "Cách sử dụng:" },
                { type: 'list', items: [
                    "Truy cập trang 'Chat bằng giọng nói' (<Mic className='inline h-4 w-4 text-purple-500' /> từ sidebar).",
                    "Nhấn nút ghi âm và nói rõ yêu cầu của bạn (ví dụ: 'Tìm công thức salad', 'Thông tin dinh dưỡng của một quả chuối là gì?').",
                    "Ứng dụng sẽ xử lý yêu cầu và phản hồi bằng giọng nói hoặc hiển thị kết quả trên màn hình."
                ]},
                { type: 'image_placeholder', text: "Giao diện tương tác bằng giọng nói." }
            ]
        },
        {
            value: "item-8", // New item
            title: "Gợi ý quán ăn lân cận",
            icon: MapPin,
            content: [
                { type: 'paragraph', text: "Tìm kiếm các nhà hàng, quán ăn gần bạn phù hợp với sở thích hoặc nhu cầu dinh dưỡng." },
                { type: 'strong', text: "Cách sử dụng (Ví dụ):" },
                 { type: 'list', items: [
                    "Trong khi trò chuyện với AI, bạn có thể hỏi: 'Tìm quán phở ngon gần đây'.",
                    "Hoặc sau khi nhận diện một món ăn, có thể có tùy chọn 'Tìm nhà hàng có món này gần bạn'.",
                    "Ứng dụng sẽ yêu cầu quyền truy cập vị trí và hiển thị danh sách/bản đồ các địa điểm phù hợp.",
                    "(Lưu ý: Tính năng này có thể đang được phát triển hoặc yêu cầu tích hợp thêm)."
                ]},
                 { type: 'image_placeholder', text: "Bản đồ hiển thị các quán ăn được gợi ý." }
            ]
        },
    ];

    return (
        <motion.div
            className="container mx-auto px-4 py-12 max-w-4xl"
            initial="initial"
            animate="animate"
            variants={pageVariants}
        >
            {/* Add MainNav here */}
            <MainNav className="mb-8" />

            <motion.div custom={0} variants={sectionVariants} className="text-center mb-12">
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="inline-block p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg"
                >
                    <HelpCircle className="h-10 w-10 text-white" />
                </motion.div>
                <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-gray-900 dark:text-white">
                    Hướng dẫn sử dụng NutriCare Agents
                </h1>
                <p className="text-xl text-muted-foreground">
                    Khám phá các tính năng mạnh mẽ để quản lý sức khỏe và dinh dưỡng của bạn.
                </p>
            </motion.div>

            <motion.div custom={1} variants={sectionVariants}>
                <Accordion type="single" collapsible className="w-full space-y-5">
                    {features.map((feature, index) => (
                        <motion.div key={feature.value} custom={index + 2} variants={sectionVariants}>
                            <AccordionItem value={feature.value} className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden bg-white dark:bg-gray-800/50 hover:shadow-md transition-shadow">
                                <AccordionTrigger className="text-lg font-semibold px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <motion.div variants={iconVariants} whileHover="hover" whileTap="tap">
                                            <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                        </motion.div>
                                        <span>{feature.title}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6 pt-2 text-base leading-relaxed space-y-3 bg-gray-50 dark:bg-gray-800">
                                    {feature.content.map((item, idx) => {
                                        if (item.type === 'paragraph') {
                                            return <p key={idx} className="text-gray-700 dark:text-gray-300">{item.text}</p>;
                                        } else if (item.type === 'strong') {
                                            return <p key={idx} className="font-semibold text-gray-800 dark:text-gray-100 mt-2">{item.text}</p>;
                                        } else if (item.type === 'list') {
                                            return (
                                                <ul key={idx} className="list-disc list-outside ml-6 space-y-1 text-gray-700 dark:text-gray-300">
                                                    {item.items.map((listItem, liIdx) => <li key={liIdx}>{listItem}</li>)}
                                                </ul>
                                            );
                                        } else if (item.type === 'image_placeholder') {
                                            return (
                                                <div key={idx} className="mt-3 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-center text-sm text-muted-foreground italic">
                                                    <ImageIcon className="inline h-5 w-5 mr-2" /> {item.text}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </AccordionContent>
                            </AccordionItem>
                        </motion.div>
                    ))}
                </Accordion>
            </motion.div>

            <motion.div custom={features.length + 2} variants={sectionVariants} className="mt-16">
                <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl font-semibold text-center flex items-center justify-center gap-2">
                            <HelpCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            Câu hỏi thường gặp (FAQ)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 px-6 pb-6">
                        <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Làm cách nào để đặt lại mật khẩu?</h4>
                            <p className="text-muted-foreground mt-1">Bạn có thể đặt lại mật khẩu thông qua liên kết 'Quên mật khẩu' trên trang đăng nhập hoặc trong phần cài đặt tài khoản ở trang 'Hồ sơ'.</p>
                        </div>
                        <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Thông tin dinh dưỡng có chính xác không?</h4>
                            <p className="text-muted-foreground mt-1">Thông tin dinh dưỡng được cung cấp dựa trên cơ sở dữ liệu và thuật toán AI ước tính. Nó mang tính tham khảo và độ chính xác có thể thay đổi. Hãy tham khảo ý kiến chuyên gia dinh dưỡng để có lời khuyên y tế cụ thể.</p>
                        </div>
                        <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Dữ liệu của tôi có được bảo mật không?</h4>
                            <p className="text-muted-foreground mt-1">Chúng tôi cam kết bảo mật dữ liệu cá nhân của bạn theo các tiêu chuẩn cao nhất. Vui lòng tham khảo Chính sách Bảo mật (nếu có) để biết thêm chi tiết về cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div custom={features.length + 3} variants={sectionVariants} className="text-center mt-12">
                <Link href="/" passHref>
                    <Button variant="outline" size="lg">
                        <Home className="mr-2 h-5 w-5" />
                        Quay lại Trang chủ
                    </Button>
                </Link>
            </motion.div>
        </motion.div>
    );
}
