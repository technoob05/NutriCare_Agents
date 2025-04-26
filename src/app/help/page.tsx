'use client'; // Required for framer-motion and other client-side hooks

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
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
  BrainCircuit,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  Info
} from 'lucide-react';
import Image from 'next/image';
import { MainNav } from '@/components/main-nav';

// Enhanced animation variants
const pageVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: { 
      duration: 0.6,
      staggerChildren: 0.1,
      delayChildren: 0.2
    } 
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.4 }
  }
};

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const iconVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 260, 
      damping: 20,
      duration: 0.6
    } 
  },
  hover: { 
    scale: 1.2, 
    rotate: 5,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 10 
    } 
  },
  tap: { scale: 0.95 }
};

export default function HelpPage() {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  
  // Refs for scroll animations
  const titleRef = useRef(null);
  const featuresRef = useRef(null);
  const faqRef = useRef(null);
  
  // Check if elements are in view
  const titleInView = useInView(titleRef, { once: true, amount: 0.5 });
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.1 });
  const faqInView = useInView(faqRef, { once: true, amount: 0.3 });

  const features = [
    {
      value: "item-1",
      title: "Bắt đầu & Thiết lập Hồ sơ",
      icon: User,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      ringColor: "ring-blue-400/30",
      content: [
        { type: 'paragraph', text: "Để ứng dụng hoạt động hiệu quả nhất, hãy bắt đầu bằng cách cung cấp một số thông tin cơ bản." },
        { type: 'strong', text: "Nhập thông tin sức khỏe:" },
        { type: 'paragraph', text: "Điều hướng đến trang 'Cài đặt' (biểu tượng bánh răng trong sidebar) -> 'Thông tin sức khỏe'. Nhập chiều cao, cân nặng, tuổi, giới tính, và mức độ hoạt động. Thông tin này rất quan trọng để cá nhân hóa các đề xuất dinh dưỡng và theo dõi tiến trình của bạn." },
        { type: 'strong', text: "Thiết lập sở thích ăn uống:" },
        { type: 'paragraph', text: "Cũng trong phần 'Thông tin sức khỏe', bạn có thể chỉ định các sở thích ăn uống (ví dụ: ăn chay, keto), dị ứng thực phẩm, hoặc các loại thực phẩm bạn muốn tránh. Điều này giúp AI gợi ý các bữa ăn phù hợp hơn." },
        { type: 'image', src: "/data/images/instruction/health_information.png", alt: "Ảnh chụp màn hình trang cài đặt thông tin sức khỏe." }
      ]
    },
    {
      value: "item-2",
      title: "Nhận diện bữa ăn (Recognize Meal)",
      icon: Camera,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      ringColor: "ring-green-400/30",
      content: [
        { type: 'paragraph', text: "Chụp ảnh hoặc tải lên hình ảnh bữa ăn của bạn để nhận phân tích dinh dưỡng tức thì." },
        { type: 'strong', text: "Cách sử dụng:" },
        { type: 'list', items: [
          "Truy cập trang 'Nhận diện món ăn' từ sidebar.",
          "Nhấp vào nút 'Tải ảnh lên' hoặc sử dụng camera tích hợp.",
          "AI sẽ phân tích hình ảnh, xác định các món ăn và ước tính thông tin dinh dưỡng (calo, protein, carb, fat).",
          "Bạn cũng có thể nhận được gợi ý công thức nấu ăn tương tự hoặc các lựa chọn thay thế lành mạnh hơn."
        ]},
        { type: 'image', src: "/data/images/instruction/Recognize_meal.png", alt: "Ảnh minh họa quá trình nhận diện bữa ăn và kết quả." }
      ]
    },
    {
      value: "item-7",
      title: "Hiểu về bữa ăn (Understand Meal)",
      icon: BrainCircuit,
      color: "text-purple-500",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      ringColor: "ring-purple-400/30",
      content: [
        { type: 'paragraph', text: "Sau khi nhận diện bữa ăn, bạn có thể tìm hiểu sâu hơn về các thành phần và lợi ích sức khỏe." },
        { type: 'strong', text: "Cách sử dụng:" },
        { type: 'list', items: [
          "Sau khi có kết quả từ 'Nhận diện bữa ăn', tìm nút hoặc tùy chọn 'Hiểu thêm về bữa ăn này'.",
          "AI sẽ cung cấp thông tin chi tiết hơn về các thành phần chính, lợi ích/tác hại tiềm ẩn, và so sánh với các mục tiêu dinh dưỡng của bạn.",
          "Bạn có thể đặt câu hỏi tiếp theo như 'Món này có phù hợp với người tiểu đường không?'."
        ]},
        { type: 'image', src: "/data/images/instruction/AI_Explainer.png", alt: "Ảnh chụp màn hình hiển thị thông tin chi tiết sau khi 'Hiểu về bữa ăn'." }
      ]
    },
    {
      value: "item-3",
      title: "Theo dõi tủ đựng thức ăn (Pantry Tracker)",
      icon: ShoppingBasket,
      color: "text-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      ringColor: "ring-amber-400/30",
      content: [
        { type: 'paragraph', text: "Quản lý các nguyên liệu bạn có sẵn trong bếp để tránh lãng phí và nhận gợi ý công thức." },
        { type: 'strong', text: "Cách sử dụng:" },
        { type: 'list', items: [
          "Truy cập trang 'Pantry Tracker' (có thể truy cập qua URL /pantry-tracker).",
          "Thêm các nguyên liệu bạn đang có, bao gồm tên và số lượng (ví dụ: trứng, 5 quả; sữa, 1 lít).",
          "Cập nhật khi bạn sử dụng hết hoặc mua thêm nguyên liệu.",
          "Sử dụng tính năng 'Gợi ý công thức' dựa trên nguyên liệu có sẵn trong tủ."
        ]},
        { type: 'image', src: "/data/images/instruction/Pantry_tracker.png", alt: "Giao diện quản lý Pantry Tracker." }
      ]
    },
    {
      value: "item-4",
      title: "Trò chuyện với AI (Chat)",
      icon: MessageSquare,
      color: "text-indigo-500",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      ringColor: "ring-indigo-400/30",
      content: [
        { type: 'paragraph', text: "Tương tác trực tiếp với trợ lý AI để đặt câu hỏi, nhận lời khuyên dinh dưỡng, hoặc lên kế hoạch bữa ăn." },
        { type: 'strong', text: "Cách sử dụng:" },
        { type: 'list', items: [
          "Nhấp vào 'Cuộc trò chuyện mới' hoặc chọn một cuộc trò chuyện cũ từ sidebar.",
          "Nhập câu hỏi hoặc yêu cầu của bạn vào ô chat (ví dụ: 'Gợi ý bữa tối ít calo và giàu protein', 'Làm thế nào để nấu món phở gà?').",
          "AI sẽ trả lời dựa trên kiến thức dinh dưỡng, thông tin hồ sơ của bạn và ngữ cảnh cuộc trò chuyện."
        ]},
        { type: 'image', src: "/data/images/instruction/current_chat.png", alt: "Ví dụ về một cuộc trò chuyện với AI." }
      ]
    },
    {
      value: "item-6",
      title: "Tương tác bằng giọng nói (Voice)",
      icon: Mic,
      color: "text-rose-500",
      bgColor: "bg-rose-100 dark:bg-rose-900/30",
      ringColor: "ring-rose-400/30",
      content: [
        { type: 'paragraph', text: "Sử dụng giọng nói để điều khiển ứng dụng và nhận phản hồi âm thanh." },
        { type: 'strong', text: "Cách sử dụng:" },
        { type: 'list', items: [
          "Truy cập trang 'Chat bằng giọng nói' từ sidebar.",
          "Nhấn nút ghi âm và nói rõ yêu cầu của bạn (ví dụ: 'Tìm công thức salad', 'Thông tin dinh dưỡng của một quả chuối là gì?').",
          "Ứng dụng sẽ xử lý yêu cầu và phản hồi bằng giọng nói hoặc hiển thị kết quả trên màn hình."
        ]},
        { type: 'image', src: "/data/images/instruction/Voice_mode.png", alt: "Giao diện tương tác bằng giọng nói." }
      ]
    },
    {
      value: "item-8",
      title: "Gợi ý quán ăn lân cận",
      icon: MapPin,
      color: "text-cyan-500",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      ringColor: "ring-cyan-400/30",
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

  // AI Principles for showcasing Responsible AI
  const aiPrinciples = [
    {
      title: "Minh bạch",
      icon: <BrainCircuit className="h-5 w-5" />,
      description: "Thuật toán của chúng tôi luôn giải thích cách ra quyết định"
    },
    {
      title: "Công bằng",
      icon: <ShieldCheck className="h-5 w-5" />,
      description: "Đảm bảo đối xử công bằng với mọi người dùng"
    },
    {
      title: "Quyền riêng tư",
      icon: <Sparkles className="h-5 w-5" />,
      description: "Dữ liệu của bạn được bảo vệ và mã hóa"
    }
  ];

  // FAQ items with more interactive elements
  const faqItems = [
    {
      question: "Làm cách nào để đặt lại mật khẩu?",
      answer: "Bạn có thể đặt lại mật khẩu thông qua liên kết 'Quên mật khẩu' trên trang đăng nhập hoặc trong phần cài đặt tài khoản ở trang 'Hồ sơ'."
    },
    {
      question: "Thông tin dinh dưỡng có chính xác không?",
      answer: "Thông tin dinh dưỡng được cung cấp dựa trên cơ sở dữ liệu và thuật toán AI ước tính. Nó mang tính tham khảo và độ chính xác có thể thay đổi. Hãy tham khảo ý kiến chuyên gia dinh dưỡng để có lời khuyên y tế cụ thể.",
      hasAIExplanation: true
    },
    {
      question: "Dữ liệu của tôi có được bảo mật không?",
      answer: "Chúng tôi cam kết bảo mật dữ liệu cá nhân của bạn theo các tiêu chuẩn cao nhất. Vui lòng tham khảo Chính sách Bảo mật để biết thêm chi tiết về cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.",
      hasAIExplanation: true
    },
    {
      question: "Tính năng nào đang được phát triển tiếp theo?",
      answer: "Chúng tôi đang phát triển tính năng phân tích xu hướng sức khỏe dài hạn, tích hợp với thiết bị đeo thông minh, và mở rộng cơ sở dữ liệu món ăn truyền thống Việt Nam."
    }
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        {/* Floating circles background effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-blue-400/10 blur-3xl"></div>
          <div className="absolute top-40 right-10 w-72 h-72 rounded-full bg-purple-400/10 blur-3xl"></div>
          <div className="absolute bottom-20 left-1/4 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl"></div>
        </div>

        {/* Main container with glass effect */}
        <div className="relative w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Nav bar with glass effect */}
          <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
            <MainNav className="py-4" />
          </div>

          {/* Hero section */}
          <motion.div 
            ref={titleRef}
            className="relative text-center py-12 md:py-20 px-4"
            variants={fadeInUp}
            animate={titleInView ? "animate" : "initial"}
          >
            <motion.div
              className="inline-flex items-center justify-center p-1 mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="bg-white dark:bg-gray-900 rounded-full p-3">
                <HelpCircle className="h-8 w-8 text-gradient-to-r from-blue-500 to-purple-600" />
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400"
              variants={fadeInUp}
            >
              Hướng dẫn sử dụng NutriCare Agents
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              Khám phá các tính năng mạnh mẽ để quản lý sức khỏe và dinh dưỡng của bạn
            </motion.p>
            
            {/* AI Principles badges */}
            <motion.div 
              className="flex flex-wrap justify-center gap-3 mt-8"
              variants={staggerContainer}
            >
              {aiPrinciples.map((principle, index) => (
                <TooltipProvider key={index}>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <motion.div
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 shadow-sm hover:shadow-md transition-all duration-300"
                        variants={iconVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <span className="text-blue-500 dark:text-blue-400">
                          {principle.icon}
                        </span>
                        <span className="text-sm font-medium">
                          {principle.title}
                        </span>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent className="p-3 max-w-xs">
                      <p>{principle.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </motion.div>
          </motion.div>

          {/* Features section with cards */}
          <motion.div 
            ref={featuresRef}
            className="relative px-4 py-8"
            variants={fadeInUp}
            animate={featuresInView ? "animate" : "initial"}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.value}
                  className={`rounded-xl overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 ${activeFeature === feature.value ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
                  variants={fadeInUp}
                  custom={index}
                  whileHover={{ y: -5 }}
                >
                  <div 
                    className="p-5 cursor-pointer"
                    onClick={() => setActiveFeature(activeFeature === feature.value ? null : feature.value)}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <motion.div 
                        className={`p-2.5 rounded-full ${feature.bgColor} ring-2 ${feature.ringColor}`}
                        variants={iconVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <feature.icon className={`h-6 w-6 ${feature.color}`} />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {feature.title}
                      </h3>
                    </div>
                    
                    <AnimatePresence>
                      {activeFeature === feature.value && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-3 pt-2 text-gray-600 dark:text-gray-300"
                        >
                          {feature.content.map((item, idx) => {
                            if (item.type === 'paragraph') {
                              return <p key={idx} className="text-sm">{item.text}</p>;
                            } else if (item.type === 'strong') {
                              return <p key={idx} className="font-semibold text-gray-800 dark:text-gray-100 mt-2 text-sm">{item.text}</p>;
                            } else if (item.type === 'list') {
                              return (
                                <ul key={idx} className="list-disc list-outside ml-5 space-y-1 text-sm">
                                  {item.items.map((listItem, liIdx) => (
                                    <li key={liIdx}>{listItem}</li>
                                  ))}
                                </ul>
                              );
                            } else if (item.type === 'image_placeholder') {
                              return (
                                <div key={idx} className="mt-3 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-100/50 dark:bg-gray-700/50 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                                  <ImageIcon className="inline h-5 w-5 mr-2" /> {item.text}
                                </div>
                              );
                            } else if (item.type === 'image' && item.src && item.alt) {
                              return (
                                <div key={idx} className="mt-3 relative w-full h-48 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm"> 
                                  <Image
                                    src={item.src}
                                    alt={item.alt}
                                    layout="fill"
                                    objectFit="cover"
                                    className="bg-gray-100 dark:bg-gray-700 hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              );
                            }
                            return null;
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* FAQ Section with animation */}
          <motion.div 
            ref={faqRef}
            className="relative max-w-4xl mx-auto my-16 px-4"
            variants={fadeInUp}
            animate={faqInView ? "animate" : "initial"}
          >
            <motion.div variants={fadeInUp}>
              <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-3">
                    <motion.div
                      variants={iconVariants}
                      whileHover="hover"
                      whileTap="tap"
                      className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30"
                    >
                      <HelpCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </motion.div>
                    Câu hỏi thường gặp (FAQ)
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-gray-200 dark:divide-gray-700">
                  <Accordion type="single" collapsible className="w-full">
                    {faqItems.map((item, index) => (
                      <AccordionItem 
                        key={index} 
                        value={`faq-${index}`}
                        className="py-4 first:pt-6 last:pb-6 border-0"
                      >
                        <AccordionTrigger className="text-base font-medium text-gray-800 dark:text-gray-100 hover:no-underline">
                          <div className="flex items-center gap-2 text-left">
                            {item.question}
                            {item.hasAIExplanation && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-4 w-4 text-blue-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Thông tin này được hỗ trợ bởi AI</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-gray-600 dark:text-gray-300 pt-2 pr-6">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {item.answer}
                          </motion.div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Call-to-action section */}
          <motion.div 
            className="relative text-center py-12 md:py-16"
            variants={fadeInUp}
          >
            <motion.div
              className="inline-block"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/" passHref>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full px-8 py-6 h-auto font-medium text-base shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Quay lại Trang chủ
                </Button>
              </Link>
            </motion.div>
            
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              © 2025 NutriCare Agents - Trợ lý dinh dưỡng AI cá nhân hóa
            </p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}