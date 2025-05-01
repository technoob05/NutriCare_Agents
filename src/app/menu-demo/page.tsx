'use client';

import React from 'react';
import { MenuAgentSystem } from '@/components/chat-mobi/MenuAgentSystem';
import { AgentInteractionStep } from '@/components/ui/AgentInteractionVisualizer';

// Sample Data (Weekly Menu)
const sampleWeeklyMenu = {
  Monday: {
    breakfast: [
      { name: 'Phở Bò', ingredients: ['Bánh phở', 'Thịt bò', 'Hành tây', 'Gia vị'], preparation: 'Nấu nước dùng, trụng bánh phở, xếp thịt và chan nước dùng.', calories: 450, protein: 25, carbs: 50, fat: 15, healthBenefits: ['Giàu protein', 'Cung cấp năng lượng'] },
    ],
    lunch: [
      { name: 'Cơm Gà Xối Mỡ', ingredients: ['Cơm trắng', 'Đùi gà', 'Dầu ăn', 'Rau xà lách'], preparation: 'Luộc gà, chiên gà, ăn kèm cơm trắng.', calories: 600, protein: 35, carbs: 60, fat: 25 },
    ],
    dinner: [
      { name: 'Salad Ức Gà', ingredients: ['Ức gà', 'Xà lách', 'Cà chua bi', 'Sốt mè rang'], preparation: 'Áp chảo ức gà, trộn với rau và sốt.', calories: 350, protein: 30, carbs: 15, fat: 18, healthBenefits: ['Ít calo', 'Giàu chất xơ'] },
    ],
  },
  Tuesday: {
    breakfast: [
      { name: 'Bún Chả', ingredients: ['Bún', 'Thịt nướng', 'Chả', 'Rau sống', 'Nước mắm chua ngọt'], preparation: 'Nướng thịt, pha nước chấm, ăn kèm bún và rau.', calories: 550, protein: 30, carbs: 70, fat: 20 },
    ],
    lunch: [
      { name: 'Cá Hồi Áp Chảo', ingredients: ['Phi lê cá hồi', 'Măng tây', 'Dầu oliu', 'Chanh'], preparation: 'Áp chảo cá hồi, luộc măng tây.', calories: 480, protein: 40, carbs: 10, fat: 30, healthBenefits: ['Giàu Omega-3'] },
    ],
    dinner: [
      { name: 'Canh Chua Cá Lóc', ingredients: ['Cá lóc', 'Dứa', 'Cà chua', 'Giá đỗ', 'Me'], preparation: 'Nấu canh chua với các nguyên liệu.', calories: 400, protein: 28, carbs: 45, fat: 12 },
    ],
  },
  // Add more days as needed...
};

// Sample Agent Feedbacks
const sampleAgentFeedbacks = [
  {
    agentName: 'Nutrition Analysis',
    feedback: 'Thực đơn cân bằng, cung cấp đủ protein và carbs. Cần bổ sung thêm rau xanh vào bữa trưa thứ Hai.',
    score: 8,
    recommendations: ['Thêm bông cải xanh luộc vào bữa trưa thứ Hai.'],
  },
  {
    agentName: 'Healthy Swap Advisor',
    feedback: 'Cơm Gà Xối Mỡ có thể thay bằng Cơm Gà Luộc để giảm lượng chất béo.',
    recommendations: ['Thay Cơm Gà Xối Mỡ bằng Cơm Gà Luộc.'],
  },
  {
    agentName: 'Goal Alignment',
    feedback: 'Thực đơn phù hợp với mục tiêu duy trì cân nặng. Lượng calo trung bình hàng ngày khoảng 1500-1700 kcal.',
    score: 9,
  },
];

// Sample Interaction Steps (Optional)
const sampleInteractionSteps: AgentInteractionStep[] = [
  { id: 1, agentName: 'User', action: 'Yêu cầu thực đơn tuần', status: 'complete', timestamp: '10:00 AM' },
  { id: 2, agentName: 'Menu Planner Agent', action: 'Tạo thực đơn nháp', status: 'processing', timestamp: '10:01 AM' },
  { id: 3, agentName: 'Nutrition Analysis', action: 'Phân tích dinh dưỡng', details: 'Kiểm tra macro và micro nutrients...', status: 'processing', timestamp: '10:02 AM' },
  { id: 4, agentName: 'Healthy Swap Advisor', action: 'Đề xuất thay thế', details: 'Tìm món ăn lành mạnh hơn...', status: 'processing', timestamp: '10:02 AM' },
  { id: 5, agentName: 'Nutrition Analysis', action: 'Hoàn thành phân tích', status: 'success', timestamp: '10:03 AM', data: { calories: '~1600kcal/day' } },
  { id: 6, agentName: 'Menu Planner Agent', action: 'Tổng hợp kết quả', status: 'complete', timestamp: '10:04 AM' },
];

export default function MenuDemoPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Demo Hệ Thống Thực Đơn Đa Agent</h1>
      <MenuAgentSystem
        menuType="weekly"
        menuData={sampleWeeklyMenu}
        userPreferences="Người dùng muốn thực đơn cân bằng, không quá cay, ưu tiên cá và rau xanh."
        agentFeedbacks={sampleAgentFeedbacks}
        interactionSteps={sampleInteractionSteps}
        isLoading={false} // Set to true to see loading state
        onShare={() => alert('Chia sẻ thực đơn!')}
        onDownload={() => alert('Tải thực đơn!')}
        onModify={(feedback) => alert(`Yêu cầu chỉnh sửa: ${feedback}`)}
      />
    </div>
  );
}