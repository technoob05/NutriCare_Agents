import { useState, useEffect } from 'react';

export interface SavedMenu {
  id: string;
  type: 'daily' | 'weekly';
  data: any;
  savedAt: string;
  name?: string;
}

export function useMenuCollection() {
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved menus from localStorage on mount
  useEffect(() => {
    const loadSavedMenus = () => {
      try {
        const saved = localStorage.getItem('nutricare_saved_menus');
        if (saved) {
          setSavedMenus(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading saved menus:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedMenus();
  }, []);

  // Save menu to collection
  const saveMenu = (menu: Omit<SavedMenu, 'id' | 'savedAt'>) => {
    try {
      const newMenu: SavedMenu = {
        ...menu,
        id: Math.random().toString(36).substring(7),
        savedAt: new Date().toISOString(),
      };

      setSavedMenus(prev => {
        const updated = [newMenu, ...prev];
        localStorage.setItem('nutricare_saved_menus', JSON.stringify(updated));
        return updated;
      });

      return true;
    } catch (error) {
      console.error('Error saving menu:', error);
      return false;
    }
  };

  // Remove menu from collection
  const removeMenu = (menuId: string) => {
    try {
      setSavedMenus(prev => {
        const updated = prev.filter(menu => menu.id !== menuId);
        localStorage.setItem('nutricare_saved_menus', JSON.stringify(updated));
        return updated;
      });
      return true;
    } catch (error) {
      console.error('Error removing menu:', error);
      return false;
    }
  };

  // Check if a menu is saved
  const isMenuSaved = (menuData: any): boolean => {
    return savedMenus.some(saved => 
      JSON.stringify(saved.data) === JSON.stringify(menuData)
    );
  };

  return {
    savedMenus,
    isLoading,
    saveMenu,
    removeMenu,
    isMenuSaved,
  };
}