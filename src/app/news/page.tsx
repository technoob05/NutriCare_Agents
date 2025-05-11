"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
// import Parser from "rss-parser"; // Removed: rss-parser is typically used server-side. Client-side uses DOMParser.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  Clock,
  RefreshCw,
  AlertTriangle,
  Rss,
  Search,
  Leaf,         // For vegan-recipes, holistic-nutrition
  FlaskConical, // For food-science-culture, nutrition-research
  ChefHat,      // For recipes
  Activity,     // For functional-health
  Newspaper,    // For news-reviews, health-news
  Landmark,     // For policy-nutrition
  Smile,        // For wellness
  Camera,       // For food-photography
  Home as HomeIcon, // For home-cooking-tips
  TrendingUp,   // For culinary-trends-cooking
  HeartPulse,   // For healthy-recipes
  Sparkles,     // Kept for potential future use or as a default
  Bookmark,
  Share2,
  ThumbsUp,
  BookOpen,
  Moon,
  Sun,
  ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

// RSS feed sources phù hợp cho NutriCare Agents - Updated with 10 new high-quality feeds
const rssFeeds = [
  {
    name: "Once Upon A Chef (Jenn Segal)",
    url: "http://www.onceuponachef.com/feed",
    category: "recipes",
  },
  {
    name: "Pinch of Yum",
    url: "http://pinchofyum.com/feed",
    category: "food-photography", // Also recipes, but photography is a key aspect
  },
  {
    name: "The Kitchn",
    url: "http://feeds.thekitchn.com/apartmenttherapy/thekitchn",
    category: "home-cooking-tips",
  },
  {
    name: "The Pioneer Woman (Ree Drummond)",
    url: "http://feeds.feedburner.com/pioneerwoman-full-rss-feed",
    category: "recipes",
  },
  {
    name: "Bon Appétit » Recipes",
    url: "https://www.bonappetit.com/feed/recipes-rss-feed/rss", // Corrected URL from common sources
    category: "culinary-trends-cooking",
  },
  {
    // Note: Epicurious feed URL can be dynamic or require finding on their site.
    // Using a known general one, might need verification or a more stable alternative.
    name: "Epicurious » New Recipes",
    url: "https://www.epicurious.com/feed/new-recipes-feed/rss", // Common stable URL for Epicurious recipes
    category: "recipes",
  },
  {
    name: "Serious Eats (Atom)",
    url: "https://www.seriouseats.com/atom.xml",
    category: "food-science-culture",
  },
  {
    name: "NYTimes Dining & Wine",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/DiningandWine.xml",
    category: "news-reviews",
  },
  {
    name: "Oh She Glows",
    url: "https://ohsheglows.com/feed/",
    category: "vegan-recipes",
  },
  {
    name: "Skinnytaste",
    url: "https://www.skinnytaste.com/feed/",
    category: "healthy-recipes",
  },
];

// Define types
type FeedItem = {
  title: string;
  link: string;
  contentSnippet: string;
  isoDate: string;
  feedName: string;
  category: string;
  image?: string;
};

// Category icons mapping for NutriCare - Updated for new feeds
const categoryIcons: Record<string, JSX.Element> = {
  "recipes": <ChefHat className="h-4 w-4" />,
  "food-photography": <Camera className="h-4 w-4" />,
  "home-cooking-tips": <HomeIcon className="h-4 w-4" />, // Renamed Home to HomeIcon to avoid conflict
  "culinary-trends-cooking": <TrendingUp className="h-4 w-4" />,
  "food-science-culture": <FlaskConical className="h-4 w-4" />,
  "news-reviews": <Newspaper className="h-4 w-4" />,
  "vegan-recipes": <Leaf className="h-4 w-4" />,
  "healthy-recipes": <HeartPulse className="h-4 w-4" />,
  // Keep some old ones for broader matching if any old feeds were to be re-added or for 'all'
  "nutrition-research": <FlaskConical className="h-4 w-4" />,
  "functional-health": <Activity className="h-4 w-4" />,
  "holistic-nutrition": <Leaf className="h-4 w-4" />,
  "health-news": <Newspaper className="h-4 w-4" />,
  "policy-nutrition": <Landmark className="h-4 w-4" />,
  "wellness": <Smile className="h-4 w-4" />,
  "all": <Rss className="h-4 w-4" />
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  if (!dateString) return "No date";
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

// Extract a snippet from content
const getSnippet = (content: string | undefined, maxLength = 150): string => {
  if (!content) return "";
  
  const plainText = content.replace(/<[^>]*>?/gm, '');
  
  if (plainText.length <= maxLength) return plainText;
  
  const lastSpace = plainText.substring(0, maxLength).lastIndexOf(' ');
  return `${plainText.substring(0, lastSpace)}...`;
};

// Generate a placeholder image based on category for NutriCare - Updated for new feeds
const getCategoryImage = (category: string) => {
  const colors: Record<string, string> = {
    "recipes": "#FFC107",                 // Amber
    "food-photography": "#9C27B0",        // Purple
    "home-cooking-tips": "#795548",       // Brown
    "culinary-trends-cooking": "#E91E63", // Pink
    "food-science-culture": "#009688",    // Teal
    "news-reviews": "#607D8B",            // Blue Grey
    "vegan-recipes": "#4CAF50",           // Green
    "healthy-recipes": "#8BC34A",         // Light Green
    // Keep old ones
    "nutrition-research": "#4CAF50",
    "functional-health": "#2196F3",
    "holistic-nutrition": "#8BC34A",
    "health-news": "#FF5722",
    "policy-nutrition": "#607D8B",
    "wellness": "#00BCD4",
  };
  
  const bgColor = colors[category] || "#7E57C2"; // Default Deep Purple
  
  return `https://via.placeholder.com/600x400/${bgColor.replace('#', '')}?text=${category.replace(/-/g, '+')}`; // Replace all hyphens
};

// Loading skeleton component
const NewsItemSkeleton = () => (
  <Card className="h-full overflow-hidden">
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 w-full"></div>
    <CardHeader>
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </CardContent>
    <CardFooter>
      <Skeleton className="h-4 w-1/3" />
    </CardFooter>
  </Card>
);

// Category card component for the homepage
const CategoryCard = ({ category, icon, count, onClick }: { 
  category: string; 
  icon: JSX.Element;
  count: number; 
  onClick: () => void;
}) => (
  <motion.div
    whileHover={{ y: -5 }}
    whileTap={{ scale: 0.98 }}
  >
    <Card 
      className="cursor-pointer h-full overflow-hidden group"
      onClick={onClick}
    >
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 flex flex-col items-center justify-center gap-3 transition-all group-hover:from-primary/30 group-hover:to-primary/20">
        <div className="p-3 bg-primary/10 rounded-full text-primary">
          {icon}
        </div>
        <h3 className="text-lg font-semibold capitalize">{category.replace('-', ' ')}</h3>
        <Badge variant="outline">{count} articles</Badge>
      </div>
    </Card>
  </motion.div>
);

// Featured article component
const FeaturedArticle = ({ article }: { article: FeedItem }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div
          className="h-64 bg-cover bg-center"
          style={{
            backgroundImage: `url(${article.image || getCategoryImage(article.category)})`,
          }}
        />
        <div className="flex flex-col h-full">
          <CardHeader>
            <div className="flex justify-between items-start gap-2">
              <div>
                <Badge variant="secondary" className="mb-2 capitalize">
                  {categoryIcons[article.category] || <Rss className="h-4 w-4" />}
                  <span className="ml-1">{article.category.replace('-', ' ')}</span>
                </Badge>
                <CardTitle className="text-2xl">{article.title}</CardTitle>
              </div>
            </div>
            <CardDescription className="text-sm flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(article.isoDate)}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-grow">
            <p className="text-base">{article.contentSnippet}</p>
          </CardContent>

          <CardFooter className="pt-2 flex justify-between items-center">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Rss className="h-3 w-3" />
              {article.feedName}
            </span>
            <Button
              variant="default"
              size="sm"
              className="flex items-center gap-1"
              asChild
            >
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read Article <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </CardFooter>
        </div>
      </div>
    </Card>
  </motion.div>
);

// News Item component with animation
const NewsItem = ({ item, index }: { item: FeedItem; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.05 }}
  >
    <Card className="flex flex-col h-full rounded-lg shadow-md hover:shadow-xl transition-all duration-300 ease-in-out group overflow-hidden">
      {item.image ? (
        <div 
          className="h-48 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ 
            backgroundImage: `url(${item.image})`
          }}
        />
      ) : (
        <div className="h-48 flex items-center justify-center bg-muted">
          {categoryIcons[item.category] ? categoryIcons[item.category] : <Rss className="h-4 w-4" />}
        </div>
      )}
      <CardHeader className="p-4">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl font-semibold leading-tight group-hover:text-primary transition-colors">{item.title}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="capitalize text-xs flex items-center gap-1">
                  {categoryIcons[item.category] ? categoryIcons[item.category] : <Rss className="h-3 w-3" />}
                  <span>{item.category.replace('-', ' ')}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Category: {item.category.replace('-', ' ')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-sm flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDate(item.isoDate)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow p-4">
        <p className="text-base leading-relaxed">{item.contentSnippet}</p>
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-between items-center p-4">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Rss className="h-3 w-3" />
          {item.feedName}
        </span>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save article</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share article</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button 
            variant="default" 
            size="sm" 
            className="ml-2 rounded-full"
            asChild
          >
            <a 
              href={item.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Read <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>
      </CardFooter>
    </Card>
  </motion.div>
);

const NutriNewsPage = () => { // Renamed from NewsPage
  const [newsItems, setNewsItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [viewMode, setViewMode] = useState<"cards" | "categories">("cards");
  const itemsPerPage = 9;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') as "light" | "dark" | null;
      if (storedTheme) {
        setTheme(storedTheme);
      } else {
        // Set theme based on system preference if no theme is stored
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const categories = useMemo(() => {
    const allCategories = new Set(rssFeeds.map(feed => feed.category));
    return ["all", ...Array.from(allCategories)];
  }, []);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const feedPromises = rssFeeds.map(async (feed) => {
        try {
          const response = await fetch(`/api/rss-proxy?url=${encodeURIComponent(feed.url)}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${feed.name}`);
          
          const xmlText = await response.text();
          const parser = new DOMParser(); // Client-side DOMParser
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          
          const errorNode = xmlDoc.querySelector('parsererror');
          if (errorNode) {
            console.error(`Error parsing XML for ${feed.name}:`, errorNode.textContent);
            throw new Error(`Error parsing XML for ${feed.name}`);
          }
          
          const items = Array.from(xmlDoc.querySelectorAll('item, entry')).map(item => { // Added 'entry' for Atom feeds
            let imageUrl: string | null = null;

            // Try to get image from media:content or enclosure
            const mediaContent = item.querySelector('media\\:content, content[type^="image"]'); // Atom uses content with type
            if (mediaContent) {
              imageUrl = mediaContent.getAttribute('url');
            }
            
            if (!imageUrl) {
              const enclosure = item.querySelector('enclosure[url]');
              if (enclosure) {
                imageUrl = enclosure.getAttribute('url');
              }
            }
            
            // If no media:content or enclosure, try to find image in description/content
            if (!imageUrl) {
              const descriptionOrContent = item.querySelector('description, summary, content')?.textContent; // Atom uses summary or content
              if (descriptionOrContent) {
                const imgTag = descriptionOrContent.match(/<img[^>]+src="([^">]+)"/);
                if (imgTag && imgTag.length > 1) {
                  imageUrl = imgTag[1];
                }
              }
            }

            const title = item.querySelector('title')?.textContent || 'No title';
            const link = item.querySelector('link:not([rel="self"])')?.getAttribute('href') || item.querySelector('link')?.textContent || ''; // Prioritize href for Atom
            const contentElement = item.querySelector('description, summary, content\\:encoded, content'); // Added content:encoded and content
            const snippet = getSnippet(contentElement?.textContent || "", 200);
            const dateElement = item.querySelector('pubDate, published, updated'); // Atom uses published or updated
            const isoDate = dateElement?.textContent || '';


            return {
              title,
              link,
              contentSnippet: snippet,
              isoDate,
              feedName: feed.name,
              category: feed.category,
              image: imageUrl || getCategoryImage(feed.category),
            };
          });

          return items;
        } catch (error) {
          console.error(`Error fetching or parsing feed ${feed.name}:`, error);
          return []; 
        }
      });

      const results = await Promise.all(feedPromises);
      const allItems = results.flat().sort((a, b) => {
        // Priority 1: Articles with real images
        const aHasRealImage = a.image && !a.image.startsWith('https://via.placeholder.com');
        const bHasRealImage = b.image && !b.image.startsWith('https://via.placeholder.com');

        if (aHasRealImage && !bHasRealImage) return -1; // a comes first
        if (!aHasRealImage && bHasRealImage) return 1;  // b comes first

        // Priority 2: Date (newest first)
        const dateA = new Date(a.isoDate || 0);
        const dateB = new Date(b.isoDate || 0);
        // Handle invalid dates by pushing them to the end
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateB.getTime() - dateA.getTime();
      });
      
      setNewsItems(allItems);
    } catch (error) {
      console.error("Error fetching news:", error);
      setError("Failed to load news feeds. Some feeds might be unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredItems = useMemo(() => {
    let items = newsItems;
    
    if (activeCategory !== "all") {
      items = items.filter(item => item.category === activeCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.contentSnippet.toLowerCase().includes(query) ||
        item.feedName.toLowerCase().includes(query)
      );
    }
    
    return items;
  }, [newsItems, activeCategory, searchQuery]);

  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, page, itemsPerPage]);

  const featuredArticle = useMemo(() => {
    // Prefer an article with an actual image for featured, if available
    const itemWithImage = newsItems.find(item => item.image && !item.image.startsWith('https://via.placeholder.com'));
    return itemWithImage || newsItems[0] || null;
  }, [newsItems]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage)); // Ensure totalPages is at least 1

  useEffect(() => {
    fetchNews();
    
    const refreshInterval = setInterval(fetchNews, 30 * 60 * 1000);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
      }
      
      if (e.key === 'ArrowRight' && page < totalPages) {
        setPage(p => p + 1);
      }
      
      if (e.key === 'ArrowLeft' && page > 1) {
        setPage(p => p - 1);
      }
      
      if (e.key >= '0' && e.key <= '9') {
        const index = parseInt(e.key) -1; // '0' maps to 'all'
        if (index === -1 && categories.includes("all")) { // '0' for 'all'
             setActiveCategory("all");
        } else if (index >= 0 && index < categories.length -1) { // 1-9 for other categories
            setActiveCategory(categories[index + 1]); // categories[0] is 'all'
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fetchNews, categories, page, totalPages]); // Added totalPages to dependency array

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: newsItems.length };
    
    newsItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    
    return counts;
  }, [newsItems]);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setPage(1); 
    setViewMode("cards"); 
  };

  const handleRefresh = () => {
    fetchNews();
  };

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === "light" ? "dark" : "light");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50 transition-colors duration-300">
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-background/80 border-b">
        <div className="container mx-auto py-3 px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" /> {/* Changed Icon */}
            <h1 className="text-xl font-bold">NutriNews</h1> {/* Changed Title */}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-full max-w-xs sm:max-w-sm md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-input"
                placeholder="Search articles... (Ctrl+K)"
                className="pl-10 rounded-full"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); 
                }}
              />
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleTheme}
                    className="rounded-full"
                  >
                    {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle {theme === "light" ? "dark" : "light"} mode</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleRefresh} 
                    disabled={loading}
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{loading ? "Refreshing..." : "Refresh feeds"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto py-8 px-4">
        {!loading && featuredArticle && (
          <section className="mb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-2xl font-bold">Featured Article</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                >
                  Articles
                </Button>
                <Button
                  variant={viewMode === "categories" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("categories")}
                >
                  Categories
                </Button>
              </div>
            </div>
            <FeaturedArticle article={featuredArticle} />
          </section>
        )}
        
        <ScrollArea className="pb-4 mb-4">
          <Tabs 
            defaultValue="all" 
            value={activeCategory} 
            onValueChange={handleCategoryChange}
            className="mb-6"
          >
            <TabsList className="mb-6 p-1 bg-muted/50 backdrop-blur-sm rounded-full inline-flex w-auto flex-wrap">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="capitalize rounded-full px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5 m-0.5"
                >
                  {categoryIcons[category] || <Rss className="h-4 w-4" />}
                  <span>{category.replace('-', ' ')}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <AnimatePresence mode="wait">
              <TabsContent value={activeCategory} className="mt-0">
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {error}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRefresh}
                        className="ml-2 mt-2 sm:mt-0"
                      >
                        Try Again
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                
                {loading && newsItems.length === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array(6).fill(0).map((_, index) => (
                      <NewsItemSkeleton key={index} />
                    ))}
                  </div>
                ) : viewMode === "categories" ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                  >
                    {categories.filter(cat => cat !== "all").map((category) => (
                      <CategoryCard
                        key={category}
                        category={category}
                        icon={categoryIcons[category] || <Rss className="h-4 w-4" />}
                        count={categoryCounts[category] || 0}
                        onClick={() => handleCategoryChange(category)}
                      />
                    ))}
                  </motion.div>
                ) : paginatedItems.length > 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {paginatedItems.map((item, index) => (
                      <NewsItem 
                        key={`${item.link}-${item.title}-${index}`} 
                        item={item} 
                        index={index}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center py-12">
                      <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No articles found</h3>
                      <p className="text-muted-foreground mb-6">
                        {searchQuery 
                          ? "Try a different search term or category."
                          : "No articles available for this category."
                        }
                      </p>
                      <div className="flex flex-col sm:flex-row justify-center gap-3">
                        {searchQuery && (
                          <Button 
                            variant="outline" 
                            onClick={() => setSearchQuery("")}
                          >
                            Clear Search
                          </Button>
                        )}
                        <Button onClick={handleRefresh}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh Feeds
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {totalPages > 1 && viewMode === "cards" && paginatedItems.length > 0 && (
                  <div className="flex justify-center mt-8">
                    <div className="bg-card flex items-center rounded-full p-1 shadow-sm border">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                        className="rounded-full text-xs h-8 w-8 p-0"
                      >
                        «
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="rounded-full text-xs h-8 w-8 p-0"
                      >
                        ‹
                      </Button>
                      
                      <div className="px-3 sm:px-4 font-medium text-sm">
                        {page} / {totalPages}
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="rounded-full text-xs h-8 w-8 p-0"
                      >
                        ›
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                        className="rounded-full text-xs h-8 w-8 p-0"
                      >
                        »
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </ScrollArea>
      </main>
      
      <footer className="border-t py-6 mt-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" /> {/* Changed Icon */}
              <p className="text-sm font-semibold">NutriNews</p> {/* Changed Title */}
            </div>
            
            <p className="text-xs text-muted-foreground text-center md:text-left">
              Shortcuts: Ctrl+K search, ← → pagination, 0-{categories.length-1} categories
            </p>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" size="sm" asChild><a href="/about">About</a></Button> {/* Example links */}
              <Button variant="ghost" size="sm" asChild><a href="/policy">Privacy</a></Button>
              <Button variant="ghost" size="sm" asChild><a href="/contact">Contact</a></Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NutriNewsPage;
