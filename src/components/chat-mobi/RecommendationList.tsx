
// RecommendationList.tsx - Phiên bản nâng cấp
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RecommendedFoodItem, { ApiRecommendationItem } from './RecommendedFoodItem';
import { 
  ChevronRight, 
  ChevronLeft, 
  FileWarning, 
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface RecommendationListProps {
  recommendations: ApiRecommendationItem[];
  title?: string;
  onViewDetails: (item: ApiRecommendationItem) => void;
}

const RecommendationList: React.FC<RecommendationListProps> = ({ 
  recommendations: initialRecommendations, 
  title, 
  onViewDetails 
}) => {
  // State
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(2);
  const [totalPages, setTotalPages] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [recommendations, setRecommendations] = useState<ApiRecommendationItem[]>(initialRecommendations);
  const [veganOnly, setVeganOnly] = useState(false);
  const [calorieRange, setCalorieRange] = useState([0, 1000]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Apply filters and sorting to recommendations
  useEffect(() => {
    let filtered = [...initialRecommendations];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) || 
        (item.ingredients && item.ingredients.toLowerCase().includes(query))
      );
    }
    
    // Filter by tab
    if (activeTab === 'vegan') {
      filtered = filtered.filter(item => item.vegan);
    } else if (activeTab === 'low-calorie') {
      filtered = filtered.filter(item => item.Calories !== undefined && item.Calories < 300);
    } else if (activeTab === 'high-protein') {
      filtered = filtered.filter(item => item.Protein !== undefined && item.Protein > 15);
    }
    
    // Apply advanced filters
    if (veganOnly) {
      filtered = filtered.filter(item => item.vegan);
    }
    
    if (calorieRange[0] > 0 || calorieRange[1] < 1000) {
      filtered = filtered.filter(item => 
        item.Calories !== undefined && 
        item.Calories >= calorieRange[0] && 
        item.Calories <= calorieRange[1]
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'score') {
        return (b.score || 0) - (a.score || 0);
      } else if (sortBy === 'calories-asc') {
        return ((a.Calories || 999) - (b.Calories || 999));
      } else if (sortBy === 'calories-desc') {
        return ((b.Calories || 0) - (a.Calories || 0));
      } else if (sortBy === 'protein') {
        return ((b.Protein || 0) - (a.Protein || 0));
      } else {
        return 0;
      }
    });
    
    setRecommendations(filtered);
    setCurrentPage(0); // Reset to first page when filters change
  }, [initialRecommendations, searchQuery, activeTab, sortBy, veganOnly, calorieRange]);
  
  // Update responsive settings based on screen size
  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const isMobileView = width < 768;
      setIsMobile(isMobileView);
      
      let itemsPerView;
          
      if (width >= 768) { // Desktop (md, lg, xl)
        itemsPerView = 6; // 3 columns * 2 rows = 6 items
      } else if (width >= 640) { // Larger mobile (sm breakpoint: 640px to 767px)
        itemsPerView = 3; // Keep original mobile setting
      } else { // Smallest mobile (xs breakpoint: < 640px)
        itemsPerView = 2; // Keep original mobile setting
      }
      
      setItemsPerPage(itemsPerView);
      setTotalPages(Math.ceil(recommendations.length / itemsPerView));
      
      // Make sure current page is valid with new layout
      if (currentPage >= Math.ceil(recommendations.length / itemsPerView)) {
        setCurrentPage(Math.max(0, Math.ceil(recommendations.length / itemsPerView) - 1));
      }
    };
    
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [recommendations, currentPage]);
  
  // Set total pages when recommendations or items per page changes
  useEffect(() => {
    setTotalPages(Math.ceil(recommendations.length / itemsPerPage));
  }, [recommendations, itemsPerPage]);
  
  // Navigation functions
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      
      // Smooth scroll to top of container when page changes
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      
      // Smooth scroll to top of container when page changes
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };
  
  // Get current page items
  const getCurrentPageItems = () => {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    return recommendations.slice(start, end);
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveTab('all');
    setSortBy('score');
    setVeganOnly(false);
    setCalorieRange([0, 1000]);
    setIsFilterOpen(false);
  };

  if (!initialRecommendations || initialRecommendations.length === 0) {
    return (
      <div className="p-6 my-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FileWarning size={28} className="text-gray-400" />
          </div>
          <div className="text-lg font-medium">Không có gợi ý nào</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            Hiện tại chưa có gợi ý món ăn nào để hiển thị. Vui lòng thử lại sau hoặc điều chỉnh các lựa chọn của bạn.
          </p>
          <Button 
            variant="outline" 
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Làm mới
          </Button>
        </div>
      </div>
    );
  }

  // No results after filtering
  if (recommendations.length === 0) {
    return (
      <div className="relative py-3" ref={containerRef}>
        {/* Title and filter controls */}
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-base font-semibold">{title || 'Gợi ý món ăn'}</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-500" 
            onClick={handleResetFilters}
          >
            <X size={16} className="mr-1" /> Xóa bộ lọc
          </Button>
        </div>
        
        {/* Search and filter controls */}
        <div className="mb-4 flex items-center space-x-2 px-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm món ăn..." 
              className="pl-8 pr-4 h-9"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-9"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Bộ lọc</span>
          </Button>
        </div>
        
        <div className="p-6 my-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Search size={28} className="text-gray-400" />
            </div>
            <div className="text-lg font-medium">Không tìm thấy kết quả</div>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              Không có món ăn nào phù hợp với bộ lọc của bạn. Vui lòng thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác.
            </p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={handleResetFilters}
            >
              Đặt lại bộ lọc
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative py-3" ref={containerRef}>
      {/* Title and filter controls */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <h3 className="text-base font-semibold mb-1">{title || 'Gợi ý món ăn'}</h3>
          <p className="text-xs text-gray-500">Hiển thị {recommendations.length} món phù hợp</p>
        </div>
        <div className="flex items-center gap-2">
          {recommendations.length !== initialRecommendations.length && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 h-8" 
              onClick={handleResetFilters}
            >
              <X size={14} className="mr-1" /> Xóa bộ lọc
            </Button>
          )}
          {recommendations.length > itemsPerPage && (
            <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
              {currentPage + 1}/{totalPages}
            </div>
          )}
        </div>
      </div>
      
      {/* Search and filter controls */}
      <div className="mb-4 flex items-center space-x-2 px-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm kiếm món ăn..." 
            className="pl-8 pr-4 h-9"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        <Button
          variant={isFilterOpen ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-1 h-9"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <SlidersHorizontal size={14} />
          <span className="hidden sm:inline">Bộ lọc</span>
        </Button>
      </div>
      
      {/* Advanced filter panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sort-by" className="text-xs font-medium mb-1 block">Sắp xếp theo</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort-by" className="h-9">
                        <SelectValue placeholder="Chọn thứ tự sắp xếp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="score">Điểm cao nhất</SelectItem>
                        <SelectItem value="calories-asc">Calories (thấp đến cao)</SelectItem>
                        <SelectItem value="calories-desc">Calories (cao đến thấp)</SelectItem>
                        <SelectItem value="protein">Protein cao nhất</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="vegan-mode"
                      checked={veganOnly}
                      onCheckedChange={setVeganOnly}
                    />
                    <Label htmlFor="vegan-mode" className="text-sm">Chỉ hiển thị món chay</Label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium mb-3 block">Giới hạn calories ({calorieRange[0]} - {calorieRange[1]} kcal)</Label>
                    <Slider
                      defaultValue={[0, 1000]}
                      max={1000}
                      step={10}
                      value={calorieRange}
                      onValueChange={setCalorieRange}
                      className="mt-6"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="mr-2"
                  onClick={handleResetFilters}
                >
                  Đặt lại
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Áp dụng
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Category tabs */}
      <div className="mb-4 px-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-2 h-9">
            <TabsTrigger value="all" className="text-xs">Tất cả</TabsTrigger>
            <TabsTrigger value="vegan" className="text-xs">Chay</TabsTrigger>
            <TabsTrigger value="low-calorie" className="text-xs">Ít calo</TabsTrigger>
            <TabsTrigger value="high-protein" className="text-xs">Giàu protein</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Items grid with animation */}
      <div className="relative min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-2"
          >
            {getCurrentPageItems().map((item, index) => (
              <motion.div
                key={item.index || (currentPage * itemsPerPage) + index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.15) }}
              >
                <RecommendedFoodItem 
                  item={item} 
                  onViewDetails={onViewDetails} 
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation controls */}
      {recommendations.length > itemsPerPage && (
        <div className="flex justify-center items-center mt-6 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage === 0}
            className="px-3 h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-30 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} className="mr-1 text-gray-600 dark:text-gray-300" />
            <span className="hidden sm:inline text-sm">Trước</span>
          </Button>
          
          {/* Page indicators for larger screens */}
          <div className="hidden md:flex items-center space-x-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              // Logic to show current page in the middle when possible
              let pageNum: number | string;
              
              if (totalPages <= 5) {
                // If 5 or fewer pages, show all page numbers
                pageNum = i;
              } else if (currentPage < 3) {
                // If near the beginning, show first 5 pages
                if (i < 4) {
                  pageNum = i;
                } else {
                  pageNum = "...";
                }
              } else if (currentPage > totalPages - 4) {
                // If near the end, show last 5 pages
                if (i === 0) {
                  pageNum = "...";
                } else {
                  pageNum = totalPages - 5 + i;
                }
              } else {
                // Otherwise show current page in the middle
                if (i === 0) {
                  pageNum = 0;
                } else if (i === 1) {
                  pageNum = "...";
                } else if (i === 3) {
                  pageNum = "...";
                } else if (i === 4) {
                  pageNum = totalPages - 1;
                } else {
                  pageNum = currentPage;
                }
              }
              
              return (
                <Button 
                  key={i}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => typeof pageNum === 'number' && setCurrentPage(pageNum)}
                  disabled={pageNum === "..." || pageNum === currentPage}
                  className={`w-9 h-9 p-0 ${
                    pageNum === "..." ? "border-none bg-transparent hover:bg-transparent" : ""
                  }`}
                >
                  {pageNum === "..." ? "…" : (pageNum as number) + 1}
                </Button>
              );
            })}
          </div>
          
          {/* Dot indicators for mobile */}
          <div className="flex md:hidden items-center space-x-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
              <div 
                key={i}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  i === currentPage % 5 
                    ? 'bg-primary scale-110' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`} 
              />
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages - 1}
            className="px-3 h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-30 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Trang sau"
          >
            <span className="hidden sm:inline text-sm">Tiếp</span>
            <ChevronRight size={16} className="ml-1 text-gray-600 dark:text-gray-300" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecommendationList;
