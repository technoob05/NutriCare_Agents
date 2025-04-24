'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform, useMotionValue, useSpring, MotionValue } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ChevronUp, Shield, Lock, Book, UserCog, Archive, AlertTriangle, Mail, Phone } from 'lucide-react';
import { MainNav } from '@/components/main-nav'; // Import MainNav

type AccordionItemProps = {
  id: string;
  title: string;
  content: string;
};

const PolicyPage = () => {
  const [activeTab, setActiveTab] = useState('terms');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  // References for section elements to check visibility
  const heroRef = useRef<HTMLDivElement>(null);
  const termsRef = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  
  // Spring animation values for smoother transitions
  const cursorSpringX = useSpring(0, { stiffness: 100, damping: 25 });
  const cursorSpringY = useSpring(0, { stiffness: 100, damping: 25 });
  
  // Using InView hooks from framer-motion
  const isHeroInView = useInView(heroRef, { once: false });
  const isTermsInView = useInView(termsRef, { once: false, margin: "-100px 0px" });
  const isPrivacyInView = useInView(privacyRef, { once: false, margin: "-100px 0px" });
  const isContactInView = useInView(contactRef, { once: false, margin: "-100px 0px" });

  // Create motion values for effects
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const { scrollY } = useScroll();
  
  // Function to scroll to top smoothly - DECLARE ONLY ONCE
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Handle scroll events with enhanced parallax effects
  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      setScrollPosition(position);
      setShowScrollTop(position > 300);
    };
    
    // Track cursor position for glow effects
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
      cursorSpringX.set(e.clientX);
      cursorSpringY.set(e.clientY);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [cursorSpringX, cursorSpringY]);
  
  // Update cursor effect position
  useEffect(() => {
    const updateCursorPosition = () => {
      cursorX.set(cursorPosition.x);
      cursorY.set(cursorPosition.y);
    };
    updateCursorPosition();
  }, [cursorPosition, cursorX, cursorY]);
  
  // Utility function to generate random particles
  const generateParticles = (count: number) => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 20 + 10
    }));
  };
  
  const particles = generateParticles(30);

  const termsAccordionItems: AccordionItemProps[] = [
    { 
      id: 'terms-1', 
      title: 'Chấp nhận Điều khoản',
      content: 'Bằng cách truy cập hoặc sử dụng Dịch vụ, bạn đồng ý bị ràng buộc bởi các Điều khoản này. Nếu bạn không đồng ý với bất kỳ phần nào của điều khoản, bạn không được phép truy cập Dịch vụ.'
    },
    { 
      id: 'terms-2', 
      title: 'Mô tả Dịch vụ',
      content: 'Nutricare Agents cung cấp nền tảng tư vấn dinh dưỡng cá nhân hóa thông qua công nghệ AI tiên tiến. Chúng tôi có quyền sửa đổi hoặc ngừng Dịch vụ bất cứ lúc nào mà không cần thông báo trước.'
    },
    { 
      id: 'terms-3', 
      title: 'Tài khoản Người dùng',
      content: 'Bạn chịu trách nhiệm bảo mật thông tin tài khoản của mình và cho tất cả các hoạt động xảy ra dưới tài khoản của bạn. Bạn phải thông báo cho chúng tôi ngay lập tức về bất kỳ vi phạm bảo mật nào liên quan đến tài khoản của bạn.'
    },
    { 
      id: 'terms-4', 
      title: 'Sở hữu Trí tuệ',
      content: 'Tất cả nội dung, tính năng và chức năng của Dịch vụ là tài sản độc quyền của Nutricare Agents và được bảo vệ bởi luật bản quyền quốc tế, thương hiệu, bằng sáng chế và các luật sở hữu trí tuệ khác.'
    },
    { 
      id: 'terms-5', 
      title: 'Giới hạn Trách nhiệm',
      content: 'Trong mọi trường hợp, Nutricare Agents sẽ không chịu trách nhiệm đối với bất kỳ thiệt hại trực tiếp, gián tiếp, đặc biệt, ngẫu nhiên hoặc do hậu quả phát sinh từ việc sử dụng Dịch vụ của bạn.'
    }
  ];

  const privacyAccordionItems: AccordionItemProps[] = [
    { 
      id: 'privacy-1', 
      title: 'Thông tin chúng tôi thu thập',
      content: 'Chúng tôi có thể thu thập thông tin cá nhân như tên, email, tuổi, thông tin sức khỏe (chiều cao, cân nặng, mức độ hoạt động, mục tiêu sức khỏe, sở thích ăn uống) khi bạn đăng ký và sử dụng dịch vụ. Chúng tôi cũng thu thập thông tin về cách bạn tương tác với ứng dụng để cải thiện trải nghiệm người dùng.'
    },
    { 
      id: 'privacy-2', 
      title: 'Cách chúng tôi sử dụng thông tin',
      content: 'Thông tin của bạn được sử dụng để cung cấp và cải thiện Dịch vụ, cá nhân hóa trải nghiệm, liên lạc với bạn và cho các mục đích phân tích nội bộ. Chúng tôi sử dụng AI để phân tích dữ liệu và đưa ra các đề xuất dinh dưỡng được cá nhân hóa.'
    },
    { 
      id: 'privacy-3', 
      title: 'Chia sẻ thông tin',
      content: 'Chúng tôi không bán hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba. Chúng tôi chỉ có thể chia sẻ thông tin trong các trường hợp hạn chế (ví dụ: với sự đồng ý của bạn, theo yêu cầu pháp lý).'
    },
    { 
      id: 'privacy-4', 
      title: 'Bảo mật dữ liệu',
      content: 'Chúng tôi áp dụng các biện pháp bảo mật hợp lý để bảo vệ thông tin của bạn khỏi truy cập, sử dụng hoặc tiết lộ trái phép. Dữ liệu của bạn được mã hóa và lưu trữ trên các máy chủ an toàn với các biện pháp bảo vệ hiện đại.'
    },
    { 
      id: 'privacy-5', 
      title: 'Quyền của bạn',
      content: 'Bạn có quyền truy cập, chỉnh sửa hoặc xóa thông tin cá nhân của mình bất cứ lúc nào. Bạn cũng có thể yêu cầu bản sao dữ liệu của mình hoặc hạn chế việc xử lý dữ liệu của chúng tôi trong một số trường hợp.'
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-green-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <MainNav /> {/* Add MainNav component here */}
      {/* Interactive background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-r from-green-300 to-blue-300 dark:from-green-500 dark:to-blue-500 opacity-30"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        ))}
      </div>
      
      {/* Cursor glow effect */}
      <motion.div
        className="fixed w-[300px] h-[300px] rounded-full pointer-events-none z-10 bg-gradient-to-r from-green-300/20 via-blue-300/20 to-purple-300/20 dark:from-green-500/20 dark:via-blue-500/20 dark:to-purple-500/20 blur-3xl"
        style={{
          left: cursorSpringX,
          top: cursorSpringY,
          x: "-50%",
          y: "-50%",
          opacity: hoveredItem ? 0.8 : 0.3
        }}
      />
      
      {/* Floating scroll-to-top button with enhanced effects */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div 
            className="fixed bottom-6 right-6 z-50"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ 
              duration: 0.5,
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
          >
            <Button 
              onClick={scrollToTop} 
              size="icon" 
              onMouseEnter={() => setHoveredItem('scrollTop')}
              onMouseLeave={() => setHoveredItem(null)}
              className="rounded-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 dark:from-green-600 dark:to-blue-600 dark:hover:from-green-500 dark:hover:to-blue-500 shadow-lg hover:shadow-green-500/25 dark:hover:shadow-green-400/20 transition-all duration-300 border-none"
              style={{
                boxShadow: hoveredItem === 'scrollTop' ? '0 0 20px 5px rgba(74, 222, 128, 0.3)' : ''
              }}
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero section with enhanced parallax and lighting effects */}
      <motion.div 
        ref={heroRef}
        className="relative py-16 md:py-28 px-4 overflow-hidden"
        style={{ 
          backgroundPosition: `50% ${scrollPosition * 0.5}px`
        }}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: isHeroInView ? 1 : 0.5,
          y: isHeroInView ? 0 : 20
        }}
        transition={{ duration: 0.8 }}
      >
        {/* Abstract shapes with parallax effect */}
        <motion.div 
          className="absolute -bottom-6 left-0 w-32 h-32 rounded-full bg-gradient-to-r from-green-300/30 to-blue-300/30 dark:from-green-700/30 dark:to-blue-700/30 blur-2xl"
          style={{ 
            x: useTransform(scrollY, [0, 500], [0, -150]),
            scale: useTransform(scrollY, [0, 500], [1, 0.5]),
          }}
        />
        <motion.div 
          className="absolute -top-12 right-1/4 w-40 h-40 rounded-full bg-gradient-to-r from-purple-300/20 to-blue-300/20 dark:from-purple-700/20 dark:to-blue-700/20 blur-2xl"
          style={{ 
            x: useTransform(scrollY, [0, 500], [0, 100]),
            scale: useTransform(scrollY, [0, 500], [1, 1.5]),
          }}
        />
        <motion.div 
          className="absolute bottom-1/3 right-10 w-24 h-24 rounded-full bg-gradient-to-r from-amber-300/20 to-red-300/20 dark:from-amber-700/20 dark:to-red-700/20 blur-2xl"
          style={{ 
            x: useTransform(scrollY, [0, 500], [0, -50]),
            y: useTransform(scrollY, [0, 500], [0, 100]),
          }}
        />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Glowing border effect */}
          <motion.div
            className="inline-block relative mb-6"
            animate={{ 
              boxShadow: isHeroInView ? [
                "0 0 0 0 rgba(74, 222, 128, 0)",
                "0 0 20px 5px rgba(74, 222, 128, 0.3)",
                "0 0 0 0 rgba(74, 222, 128, 0)"
              ] : "none"
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "loop"
            }}
          >
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-blue-500 p-1 flex items-center justify-center mx-auto"
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.05, 1]
              }}
              transition={{
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
              }}
            >
              <motion.div className="bg-white dark:bg-slate-900 rounded-full w-full h-full flex items-center justify-center">
                <Shield className="w-10 h-10 text-green-500 dark:text-green-400" />
              </motion.div>
            </motion.div>
          </motion.div>
          
          <motion.h1 
            className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500 dark:from-green-400 dark:via-emerald-400 dark:to-blue-400 bg-clip-text text-transparent"
            initial={{ y: -50, opacity: 0 }}
            animate={{ 
              y: isHeroInView ? 0 : -20, 
              opacity: isHeroInView ? 1 : 0 
            }}
            transition={{ duration: 0.6 }}
          >
            Điều khoản & Chính sách
          </motion.h1>
          
          <motion.div
            className="relative inline-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHeroInView ? 1 : 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <motion.p 
              className="text-lg md:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto relative z-10"
              initial={{ y: 50, opacity: 0 }}
              animate={{ 
                y: isHeroInView ? 0 : 20, 
                opacity: isHeroInView ? 1 : 0 
              }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Hiểu rõ cách chúng tôi bảo vệ quyền lợi và dữ liệu của bạn tại 
              <span className="relative">
                <span className="relative z-10 font-semibold text-green-600 dark:text-green-400 ml-2">
                  Nutricare Agents
                </span>
                <motion.span 
                  className="absolute bottom-0 left-2 right-0 h-2 bg-green-200 dark:bg-green-900/50 rounded-sm -z-0"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                />
              </span>
            </motion.p>
            
            {/* Subtle glow under the text */}
            <motion.div 
              className="absolute -bottom-4 left-1/2 w-1/2 h-4 bg-green-300/30 dark:bg-green-700/30 rounded-full blur-xl -translate-x-1/2"
              animate={{
                opacity: [0.3, 0.7, 0.3],
                width: ["50%", "60%", "50%"]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          </motion.div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 pb-20">
        <motion.div 
          className="w-full max-w-4xl mx-auto"
          variants={{
            hidden: { opacity: 0 },
            visible: { 
              opacity: 1,
              transition: { 
                staggerChildren: 0.1,
                duration: 0.6
              }
            }
          }}
          initial="hidden"
          animate="visible"
        >
          <Card className="border-none shadow-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md relative overflow-hidden">
            {/* Card glow effects that follow mouse */}
            <motion.div 
              className="absolute -inset-0.5 bg-gradient-to-r from-green-300 to-blue-300 dark:from-green-700 dark:to-blue-600 rounded-xl opacity-0 blur-xl group-hover:opacity-50 transition duration-1000"
              animate={{
                opacity: [0.1, 0.2, 0.1],
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                repeatType: "loop"
              }}
            />
            
            {/* Card inner border with glowing effect */}
            <div className="absolute inset-px rounded-xl bg-white dark:bg-slate-800 z-10"></div>
            
            <CardContent className="p-0 relative z-20">
              {/* Tabs navigation with enhanced effects */}
              <Tabs 
                defaultValue="terms" 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="w-full"
              >
                <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-t-lg border-b border-slate-200 dark:border-slate-700 overflow-hidden">
                  {/* Animated highlight that follows active tab */}
                  <motion.div 
                    className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-green-400 to-blue-500 dark:from-green-300 dark:to-blue-400"
                    style={{
                      width: "50%",
                      x: activeTab === "privacy" ? "100%" : "0%",
                    }}
                    animate={{
                      x: activeTab === "privacy" ? "50%" : "0%",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                  />

                  <TabsList className="w-full h-16 grid grid-cols-2 rounded-none bg-transparent relative">
                    <TabsTrigger 
                      value="terms"
                      onMouseEnter={() => setHoveredItem('termsTrigger')}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400 text-lg font-medium transition-all overflow-hidden group"
                    >
                      <div className="relative flex items-center gap-2 z-10">
                        <motion.div
                          animate={{
                            y: activeTab === "terms" ? [0, -2, 0] : 0
                          }}
                          transition={{
                            duration: 1,
                            repeat: activeTab === "terms" ? Infinity : 0,
                            repeatType: "loop",
                            repeatDelay: 2
                          }}
                        >
                          <Book className={`w-5 h-5 ${activeTab === "terms" ? "text-green-500 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}`} />
                        </motion.div>
                        <span>Điều khoản dịch vụ</span>
                      </div>
                      
                      {/* Hover glow effect */}
                      <motion.div 
                        className="absolute inset-0 bg-green-100/50 dark:bg-green-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          boxShadow: hoveredItem === 'termsTrigger' && activeTab !== "terms" ? "inset 0 0 20px 5px rgba(74, 222, 128, 0.1)" : "none",
                          opacity: hoveredItem === 'termsTrigger' && activeTab !== "terms" ? 1 : 0
                        }}
                      />
                      
                      {/* Active indicator */}
                      {activeTab === "terms" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-400 to-blue-500" 
                          layoutId="activeTabIndicator"
                        />
                      )}
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="privacy"
                      onMouseEnter={() => setHoveredItem('privacyTrigger')}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-lg font-medium transition-all overflow-hidden group"
                    >
                      <div className="relative flex items-center gap-2 z-10">
                        <motion.div
                          animate={{
                            y: activeTab === "privacy" ? [0, -2, 0] : 0,
                            rotate: activeTab === "privacy" ? [0, -10, 0, 10, 0] : 0
                          }}
                          transition={{
                            y: {
                              duration: 1,
                              repeat: activeTab === "privacy" ? Infinity : 0,
                              repeatType: "loop",
                              repeatDelay: 2
                            },
                            rotate: {
                              duration: 0.5,
                              repeat: activeTab === "privacy" ? Infinity : 0,
                              repeatType: "loop",
                              repeatDelay: 3
                            }
                          }}
                        >
                          <Lock className={`w-5 h-5 ${activeTab === "privacy" ? "text-blue-500 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`} />
                        </motion.div>
                        <span>Chính sách bảo mật</span>
                      </div>
                      
                      {/* Hover glow effect */}
                      <motion.div 
                        className="absolute inset-0 bg-blue-100/50 dark:bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          boxShadow: hoveredItem === 'privacyTrigger' && activeTab !== "privacy" ? "inset 0 0 20px 5px rgba(59, 130, 246, 0.1)" : "none",
                          opacity: hoveredItem === 'privacyTrigger' && activeTab !== "privacy" ? 1 : 0
                        }}
                      />
                      
                      {/* Active indicator */}
                      {activeTab === "privacy" && (
                        <motion.div 
                          className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 to-purple-500" 
                          layoutId="activeTabIndicator"
                        />
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-6 md:p-8">
                  {/* Terms of Service Tab */}
                  <TabsContent 
                    value="terms" 
                    className="mt-0 focus-visible:outline-none focus-visible:ring-0"
                    ref={termsRef}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="terms"
                        variants={{
                          hidden: { opacity: 0 },
                          visible: { opacity: 1 }
                        }}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ duration: 0.4 }}
                      >
                        <motion.div
                          variants={{
                            hidden: { y: 20, opacity: 0 },
                            visible: { 
                              y: 0, 
                              opacity: 1,
                              transition: { duration: 0.5 }
                            }
                          }}
                          className="mb-8"
                        >
                          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                            Điều khoản dịch vụ
                          </h2>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Chào mừng bạn đến với Nutricare Agents! Vui lòng đọc kỹ các điều khoản dịch vụ này trước khi sử dụng ứng dụng của chúng tôi.
                            Các điều khoản này quy định mối quan hệ giữa bạn và Nutricare Agents khi bạn sử dụng dịch vụ của chúng tôi.
                          </p>
                        </motion.div>

                        <motion.div variants={{
                          hidden: { y: 20, opacity: 0 },
                          visible: { 
                            y: 0, 
                            opacity: 1,
                            transition: { duration: 0.5, delay: 0.1 }
                          }
                        }}>
                          <div className="my-6 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-l-4 border-green-500">
                            <p className="text-green-800 dark:text-green-300 font-medium">
                              Cập nhật gần đây: 23 tháng 4, 2025
                            </p>
                          </div>
                        </motion.div>

                        <motion.div variants={{
                          hidden: { y: 20, opacity: 0 },
                          visible: { 
                            y: 0, 
                            opacity: 1,
                            transition: { duration: 0.5, delay: 0.2 }
                          }
                        }}>
                          <div className="mt-8 space-y-4">
                            <Accordion type="single" collapsible className="w-full">
                              {termsAccordionItems.map((item, index) => (
                                <AccordionItem 
                                  key={item.id} 
                                  value={item.id}
                                  className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4 overflow-hidden transition-all duration-500 group"
                                  style={{
                                    background: hoveredItem === item.id ? "linear-gradient(to right, rgba(236, 253, 245, 0.8), rgba(240, 253, 250, 0.2))" : "",
                                    boxShadow: hoveredItem === item.id ? "0 0 20px 2px rgba(16, 185, 129, 0.15)" : ""
                                  }}
                                >
                                  <AccordionTrigger 
                                    className="px-4 py-3 hover:no-underline group/trigger"
                                    onMouseEnter={() => setHoveredItem(item.id)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                  >
                                    <div className="flex items-center">
                                      <motion.div
                                        className="relative"
                                        whileHover={{ scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                      >
                                        <motion.span 
                                          className="flex items-center justify-center w-8 h-8 mr-3 bg-gradient-to-br from-green-400 to-emerald-500 dark:from-green-500 dark:to-emerald-600 text-white rounded-full font-medium text-sm relative z-10"
                                          animate={{ 
                                            boxShadow: hoveredItem === item.id ? [
                                              "0 0 0 0 rgba(16, 185, 129, 0)",
                                              "0 0 0 4px rgba(16, 185, 129, 0.2)",
                                              "0 0 0 0 rgba(16, 185, 129, 0)"
                                            ] : "none"
                                          }}
                                          transition={{ 
                                            duration: 1.5, 
                                            repeat: Infinity,
                                            repeatType: "loop"
                                          }}
                                        >
                                          {index + 1}
                                        </motion.span>
                                        
                                        {/* Extra glow effect on hover */}
                                        <motion.div 
                                          className="absolute inset-0 rounded-full bg-green-400 blur-md -z-10"
                                          initial={{ opacity: 0, scale: 1 }}
                                          animate={{ 
                                            opacity: hoveredItem === item.id ? 0.5 : 0,
                                            scale: hoveredItem === item.id ? 1.2 : 1
                                          }}
                                          transition={{ duration: 0.3 }}
                                        />
                                      </motion.div>
                                      
                                      <h3 className="text-xl font-medium text-left group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors duration-300">
                                        {item.title}
                                      </h3>
                                    </div>
                                    
                                    {/* Custom chevron with animation */}
                                    <motion.div
                                      initial={{ rotate: 0 }}
                                      animate={{ rotate: hoveredItem === item.id ? 45 : 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="text-green-500 dark:text-green-400"
                                    >
                                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                                        <path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                      </svg>
                                    </motion.div>
                                  </AccordionTrigger>
                                  
                                  <AccordionContent className="overflow-hidden">
                                    <motion.div 
                                      className="px-6 pb-4 pt-2 text-slate-600 dark:text-slate-300 leading-relaxed relative"
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.4 }}
                                    >
                                      <div className="pl-11 relative">
                                        {/* Side highlight for content */}
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-400 to-emerald-500 dark:from-green-500 dark:to-emerald-600 rounded-full" />
                                        
                                        {/* Content with subtle animation */}
                                        <motion.div
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ delay: 0.2, duration: 0.4 }}
                                        >
                                          {item.content}
                                        </motion.div>
                                      </div>
                                    </motion.div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>
                  </TabsContent>

                  {/* Privacy Policy Tab */}
                  <TabsContent 
                    value="privacy" 
                    className="mt-0 focus-visible:outline-none focus-visible:ring-0"
                    ref={privacyRef}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="privacy"
                        variants={{
                          hidden: { opacity: 0 },
                          visible: { opacity: 1 }
                        }}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ duration: 0.4 }}
                      >
                        <motion.div
                          variants={{
                            hidden: { y: 20, opacity: 0 },
                            visible: { 
                              y: 0, 
                              opacity: 1,
                              transition: { duration: 0.5 }
                            }
                          }}
                          className="mb-8"
                        >
                          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                            Chính sách bảo mật
                          </h2>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Chúng tôi cam kết bảo vệ quyền riêng tư của bạn. Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn khi bạn sử dụng Nutricare Agents.
                          </p>
                        </motion.div>

                        <motion.div variants={{
                          hidden: { y: 20, opacity: 0 },
                          visible: { 
                            y: 0, 
                            opacity: 1,
                            transition: { duration: 0.5, delay: 0.1 }
                          }
                        }}>
                          <div className="my-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-500">
                            <p className="text-blue-800 dark:text-blue-300 font-medium">
                              Thông tin của bạn là ưu tiên hàng đầu của chúng tôi. Chúng tôi không bao giờ bán dữ liệu của bạn cho bên thứ ba.
                            </p>
                          </div>
                        </motion.div>

                        <motion.div variants={{
                          hidden: { y: 20, opacity: 0 },
                          visible: { 
                            y: 0, 
                            opacity: 1,
                            transition: { duration: 0.5, delay: 0.2 }
                          }
                        }}>
                          <div className="mt-8 space-y-4">
                            <Accordion type="single" collapsible className="w-full">
                              {privacyAccordionItems.map((item, index) => (
                                <AccordionItem 
                                  key={item.id} 
                                  value={item.id}
                                  className="border border-slate-200 dark:border-slate-700 rounded-lg mb-4 overflow-hidden transition-all duration-500 group"
                                  style={{
                                    background: hoveredItem === item.id ? "linear-gradient(to right, rgba(239, 246, 255, 0.8), rgba(243, 244, 246, 0.2))" : "",
                                    boxShadow: hoveredItem === item.id ? "0 0 20px 2px rgba(59, 130, 246, 0.15)" : ""
                                  }}
                                >
                                  <AccordionTrigger 
                                    className="px-4 py-3 hover:no-underline group/trigger"
                                    onMouseEnter={() => setHoveredItem(item.id)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                  >
                                    <div className="flex items-center">
                                      <motion.div
                                        className="relative"
                                        whileHover={{ scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                      >
                                        <motion.span 
                                          className="flex items-center justify-center w-8 h-8 mr-3 bg-gradient-to-br from-blue-400 to-indigo-500 dark:from-blue-500 dark:to-indigo-600 text-white rounded-full font-medium text-sm relative z-10"
                                          animate={{ 
                                            boxShadow: hoveredItem === item.id ? [
                                              "0 0 0 0 rgba(59, 130, 246, 0)",
                                              "0 0 0 4px rgba(59, 130, 246, 0.2)",
                                              "0 0 0 0 rgba(59, 130, 246, 0)"
                                            ] : "none"
                                          }}
                                          transition={{ 
                                            duration: 1.5, 
                                            repeat: Infinity,
                                            repeatType: "loop"
                                          }}
                                        >
                                          {index + 1}
                                        </motion.span>
                                        
                                        {/* Extra glow effect on hover */}
                                        <motion.div 
                                          className="absolute inset-0 rounded-full bg-blue-400 blur-md -z-10"
                                          initial={{ opacity: 0, scale: 1 }}
                                          animate={{ 
                                            opacity: hoveredItem === item.id ? 0.5 : 0,
                                            scale: hoveredItem === item.id ? 1.2 : 1
                                          }}
                                          transition={{ duration: 0.3 }}
                                        />
                                      </motion.div>
                                      
                                      <h3 className="text-xl font-medium text-left group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">
                                        {item.title}
                                      </h3>
                                    </div>
                                    
                                    {/* Custom chevron with animation */}
                                    <motion.div
                                      initial={{ rotate: 0 }}
                                      animate={{ rotate: hoveredItem === item.id ? 45 : 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="text-blue-500 dark:text-blue-400"
                                    >
                                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                                        <path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                      </svg>
                                    </motion.div>
                                  </AccordionTrigger>
                                  
                                  <AccordionContent className="overflow-hidden">
                                    <motion.div 
                                      className="px-6 pb-4 pt-2 text-slate-600 dark:text-slate-300 leading-relaxed relative"
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.4 }}
                                    >
                                      <div className="pl-11 relative">
                                        {/* Side highlight for content */}
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-indigo-500 dark:from-blue-500 dark:to-indigo-600 rounded-full" />
                                        
                                        {/* Content with subtle animation */}
                                        <motion.div
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ delay: 0.2, duration: 0.4 }}
                                        >
                                          {item.content}
                                        </motion.div>
                                      </div>
                                    </motion.div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Contact Section */}
              <motion.div 
                ref={contactRef}
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: { 
                    y: 0, 
                    opacity: 1,
                    transition: { duration: 0.5 }
                  }
                }}
                className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/90 rounded-b-lg border-t border-slate-200 dark:border-slate-700 relative overflow-hidden"
              >
                {/* Background decorative elements */}
                <motion.div 
                  className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-purple-200/20 to-pink-200/20 dark:from-purple-900/10 dark:to-pink-900/10 blur-xl"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
                
                <motion.div 
                  className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-gradient-to-tr from-blue-200/20 to-green-200/20 dark:from-blue-900/10 dark:to-green-900/10 blur-xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.2, 0.4, 0.2],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: 1
                  }}
                />
                
                <div className="relative z-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: isContactInView ? 1 : 0, 
                      y: isContactInView ? 0 : 20 
                    }}
                    transition={{ duration: 0.7 }}
                    className="mb-8"
                  >
                    <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-slate-800 dark:text-slate-100 inline-flex items-center gap-2">
                      <motion.div
                        animate={{
                          rotate: isContactInView ? [0, -10, 0, 10, 0] : 0
                        }}
                        transition={{
                          duration: 1,
                          delay: 0.5,
                          repeat: 2,
                          repeatDelay: 3
                        }}
                      >
                        <Mail className="h-6 w-6 text-purple-500 dark:text-purple-400" />
                      </motion.div>
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                        Liên hệ với chúng tôi
                      </span>
                    </h2>
                    
                    <p className="text-slate-600 dark:text-slate-300 md:text-lg mb-4">
                      Nếu bạn có bất kỳ câu hỏi nào về Điều khoản dịch vụ hoặc Chính sách bảo mật của chúng tôi, vui lòng liên hệ qua các kênh sau:
                    </p>
                  </motion.div>
                  
                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <motion.div 
                      className="relative group bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ 
                        opacity: isContactInView ? 1 : 0, 
                        x: isContactInView ? 0 : -50 
                      }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      whileHover={{ 
                        y: -8,
                        transition: { duration: 0.2, type: "spring", stiffness: 300 }
                      }}
                      onMouseEnter={() => setHoveredItem('emailContact')}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      {/* Glow effect on hover */}
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-blue-400/10 dark:from-green-400/5 dark:to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          boxShadow: hoveredItem === 'emailContact' ? "inset 0 0 20px 5px rgba(74, 222, 128, 0.1)" : "none",
                        }}
                      />
                      
                      {/* Border glow on hover */}
                      <motion.div 
                        className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl opacity-0 group-hover:opacity-100 blur-sm transition-all duration-500 -z-10"
                        animate={{ 
                          opacity: hoveredItem === 'emailContact' ? [0.3, 0.6, 0.3] : 0,
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                        }}
                        transition={{ 
                          duration: 5,
                          repeat: Infinity,
                          repeatType: "loop"
                        }}
                      />
                      
                      <div className="flex items-start">
                        <motion.div 
                          className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 text-green-600 dark:text-green-400 mr-4"
                          whileHover={{ rotate: 5 }}
                          animate={{ 
                            scale: hoveredItem === 'emailContact' ? [1, 1.1, 1] : 1,
                          }}
                          transition={{ 
                            scale: {
                              duration: 1.5,
                              repeat: hoveredItem === 'emailContact' ? Infinity : 0,
                              repeatType: "reverse"
                            }
                          }}
                        >
                          <Mail className="h-6 w-6" />
                        </motion.div>
                        
                        <div>
                          <h3 className="font-semibold text-xl text-green-600 dark:text-green-400 mb-2">Email Hỗ trợ</h3>
                          <motion.p 
                            className="text-slate-800 dark:text-slate-200 text-lg"
                            animate={{ 
                              x: hoveredItem === 'emailContact' ? [0, 2, 0] : 0 
                            }}
                            transition={{ 
                              duration: 0.5, 
                              repeat: hoveredItem === 'emailContact' ? Infinity : 0,
                              repeatDelay: 1
                            }}
                          >
                            support@nutricare-agents.com
                          </motion.p>
                          
                          {/* Show text on hover */}
                          <motion.p 
                            className="text-sm text-slate-500 dark:text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            initial={{ height: 0 }}
                            animate={{ 
                              height: hoveredItem === 'emailContact' ? 'auto' : 0,
                              opacity: hoveredItem === 'emailContact' ? 1 : 0
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            Chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc
                          </motion.p>
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="relative group bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ 
                        opacity: isContactInView ? 1 : 0, 
                        x: isContactInView ? 0 : 50 
                      }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      whileHover={{ 
                        y: -8,
                        transition: { duration: 0.2, type: "spring", stiffness: 300 }
                      }}
                      onMouseEnter={() => setHoveredItem('phoneContact')}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      {/* Glow effect on hover */}
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-pink-400/10 dark:from-purple-400/5 dark:to-pink-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          boxShadow: hoveredItem === 'phoneContact' ? "inset 0 0 20px 5px rgba(192, 132, 252, 0.1)" : "none",
                        }}
                      />
                      
                      {/* Border glow on hover */}
                      <motion.div 
                        className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl opacity-0 group-hover:opacity-100 blur-sm transition-all duration-500 -z-10"
                        animate={{ 
                          opacity: hoveredItem === 'phoneContact' ? [0.3, 0.6, 0.3] : 0,
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                        }}
                        transition={{ 
                          duration: 5,
                          repeat: Infinity,
                          repeatType: "loop"
                        }}
                      />
                      
                      <div className="flex items-start">
                        <motion.div 
                          className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-600 dark:text-purple-400 mr-4"
                          whileHover={{ rotate: -5 }}
                          animate={{ 
                            scale: hoveredItem === 'phoneContact' ? [1, 1.1, 1] : 1,
                            rotate: hoveredItem === 'phoneContact' ? [0, -5, 0, 5, 0] : 0
                          }}
                          transition={{ 
                            scale: {
                              duration: 1.5,
                              repeat: hoveredItem === 'phoneContact' ? Infinity : 0,
                              repeatType: "reverse"
                            },
                            rotate: {
                              duration: 0.5,
                              repeat: hoveredItem === 'phoneContact' ? Infinity : 0,
                              repeatDelay: 1
                            }
                          }}
                        >
                          <Phone className="h-6 w-6" />
                        </motion.div>
                        
                        <div>
                          <h3 className="font-semibold text-xl text-purple-600 dark:text-purple-400 mb-2">Hotline</h3>
                          <motion.p 
                            className="text-slate-800 dark:text-slate-200 text-lg"
                            animate={{ 
                              x: hoveredItem === 'phoneContact' ? [0, 2, 0] : 0 
                            }}
                            transition={{ 
                              duration: 0.5, 
                              repeat: hoveredItem === 'phoneContact' ? Infinity : 0,
                              repeatDelay: 1
                            }}
                          >
                            (+84) 123 456 789
                          </motion.p>
                          
                          {/* Show text on hover */}
                          <motion.p 
                            className="text-sm text-slate-500 dark:text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            initial={{ height: 0 }}
                            animate={{ 
                              height: hoveredItem === 'phoneContact' ? 'auto' : 0,
                              opacity: hoveredItem === 'phoneContact' ? 1 : 0
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            Hỗ trợ từ 8:00 - 22:00, từ thứ Hai đến Chủ nhật
                          </motion.p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          {/* Last updated notice with enhanced animations */}
          <motion.div 
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { 
                y: 0, 
                opacity: 1,
                transition: { duration: 0.5, delay: 0.3 }
              }
            }}
            className="text-center text-slate-500 dark:text-slate-400 mt-12 mb-6 relative"
          >
            <motion.div 
              className="absolute left-1/2 -top-6 w-32 h-1 bg-gradient-to-r from-green-300 via-blue-300 to-purple-300 dark:from-green-700 dark:via-blue-700 dark:to-purple-700 rounded-full -translate-x-1/2 opacity-50"
              animate={{
                width: ["8rem", "12rem", "8rem"],
                opacity: [0.3, 0.7, 0.3]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
            
            <div className="relative z-10 space-y-2">
              <motion.p 
                className="text-base font-medium bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 dark:from-green-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent inline-block"
                animate={{ 
                  backgroundPosition: ['0% center', '100% center', '0% center'] 
                }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity, 
                  repeatType: "reverse" 
                }}
              >
                © 2025 Nutricare Agents
              </motion.p>
              
              <p className="text-sm">
                Tất cả các quyền được bảo lưu
              </p>
              
              <div className="flex items-center justify-center space-x-1 text-sm mt-1">
                <span>Điều khoản & Chính sách được cập nhật lần cuối:</span>
                <motion.span 
                  className="font-semibold text-blue-600 dark:text-blue-400"
                  animate={{ 
                    opacity: [1, 0.7, 1],
                    scale: [1, 1.03, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  23/04/2025
                </motion.span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Final glow effects at bottom of page */}
      <div className="relative h-16 overflow-hidden">
        <motion.div 
          className="absolute bottom-0 left-1/4 w-1/2 h-32 bg-gradient-to-t from-green-500/20 to-transparent dark:from-green-700/20 rounded-full blur-3xl"
          animate={{
            opacity: [0.2, 0.5, 0.2],
            width: ["40%", "60%", "40%"],
            x: ["-10%", "10%", "-10%"]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "mirror"
          }}
        />
      </div>
    </div>
  );
};

export default PolicyPage;
