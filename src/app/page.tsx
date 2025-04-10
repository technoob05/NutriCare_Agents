'use client';

import React, {useState, useCallback, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {generateMenuFromPreferences} from '@/ai/flows/generate-menu-from-preferences';
import {suggestMenuModificationsBasedOnFeedback} from '@/ai/flows/suggest-menu-modifications-based-on-feedback';
import {SearchResult} from '@/services/google-search';

const HomePage = () => {
  const [preferences, setPreferences] = useState('');
  const [menuType, setMenuType] = useState<'daily' | 'weekly'>('daily');
  const [generatedMenu, setGeneratedMenu] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [menuModifications, setMenuModifications] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<
    {text: string; type: 'user' | 'bot'}[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const handlePreferenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPreferences(e.target.value);
  };

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback(e.target.value);
  };

  const generateMenu = useCallback(async () => {
    setIsLoading(true);
    setChatHistory(prev => [...prev, {text: `Generating ${menuType} menu with preferences: ${preferences}`, type: 'user'}]);

    try {
      const menuData = await generateMenuFromPreferences({
        preferences: preferences,
        menuType: menuType,
      });

      setGeneratedMenu(menuData.menu);
      setChatHistory(prev => [...prev, {text: `Here is your generated ${menuType} menu:\n${JSON.stringify(menuData.menu, null, 2)}`, type: 'bot'}]);
    } catch (error: any) {
      console.error('Error generating menu:', error);
      setChatHistory(prev => [...prev, {text: `Error generating menu: ${error.message}`, type: 'bot'}]);
    } finally {
      setIsLoading(false);
    }
  }, [preferences, menuType]);

  const suggestModifications = useCallback(async () => {
    setIsLoading(true);
    setChatHistory(prev => [...prev, {text: `Suggesting menu modifications based on feedback: ${feedback}`, type: 'user'}]);

    if (!generatedMenu) {
      alert('Please generate a menu first.');
      return;
    }

    try {
      const modifications = await suggestMenuModificationsBasedOnFeedback({
        menu: JSON.stringify(generatedMenu),
        feedback: feedback,
      });

      setMenuModifications(modifications);
      setChatHistory(prev => [...prev, {text: `Suggested menu modifications:\n${JSON.stringify(modifications, null, 2)}`, type: 'bot'}]);
    } catch (error: any) {
      console.error('Error suggesting modifications:', error);
      setChatHistory(prev => [...prev, {text: `Error suggesting modifications: ${error.message}`, type: 'bot'}]);
    } finally {
      setIsLoading(false);
    }
  }, [generatedMenu, feedback]);

  useEffect(() => {
    // Load from local storage
    if (typeof window !== 'undefined') {
      const storedPreferences = localStorage.getItem('userPreferences');
      if (storedPreferences) {
        setPreferences(storedPreferences);
      }
    }
  }, []);

  useEffect(() => {
    // Save to local storage
    if (typeof window !== 'undefined') {
      localStorage.setItem('userPreferences', preferences);
    }
  }, [preferences]);

  return (
    <div className="container mx-auto p-4 flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Vietnamese Diet Planner</CardTitle>
          <CardDescription>
            Enter your preferences to generate a daily or weekly Vietnamese menu.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex gap-2">
            <Button active={menuType === 'daily'} onClick={() => setMenuType('daily')}>
              Daily Menu
            </Button>
            <Button active={menuType === 'weekly'} onClick={() => setMenuType('weekly')}>
              Weekly Menu
            </Button>
          </div>
          <Textarea
            placeholder="Enter your dietary preferences, preferred dishes, and meal frequency."
            value={preferences}
            onChange={handlePreferenceChange}
          />
          <Button onClick={generateMenu} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Menu'}
          </Button>
        </CardContent>
      </Card>

      {generatedMenu && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Menu</CardTitle>
            <CardDescription>
              Here is your generated {menuType} Vietnamese menu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre>{JSON.stringify(generatedMenu, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {generatedMenu && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
            <CardDescription>
              Provide feedback on the generated menu to get suggestions for modifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Textarea
              placeholder="Enter your feedback on the generated menu."
              value={feedback}
              onChange={handleFeedbackChange}
            />
            <Button onClick={suggestModifications} disabled={isLoading}>
              {isLoading ? 'Suggesting...' : 'Suggest Modifications'}
            </Button>
          </CardContent>
        </Card>
      )}

      {menuModifications && (
        <Card>
          <CardHeader>
            <CardTitle>Menu Modifications</CardTitle>
            <CardDescription>
              Here are suggestions for modifications based on your feedback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre>{JSON.stringify(menuModifications, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Chat History</CardTitle>
        </CardHeader>
        <CardContent>
          {chatHistory.map((message, index) => (
            <div key={index} className={`mb-2 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
              <span className="font-bold">{message.type === 'user' ? 'You:' : 'Bot:'}</span> {message.text}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;

