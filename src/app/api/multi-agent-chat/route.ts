import { NextResponse } from 'next/server';
import { AgentStep } from '@/components/ui/agent-process-visualizer'; // Assuming type definition exists

// Mock data for demonstration
const mockAgentSteps: AgentStep[] = [
  { stepName: 'Nhận yêu cầu', status: 'success' }, // Removed details
  { stepName: 'Phân tích yêu cầu', status: 'success' }, // Removed details
  { stepName: 'Tham vấn chuyên gia dinh dưỡng (AI)', status: 'skipped' }, // Removed details
  { stepName: 'Tạo thực đơn chi tiết', status: 'skipped' }, // Removed details
  { stepName: 'Hoàn thành', status: 'skipped' }, // Removed details
];

const mockMenuData = {
  title: 'Thực đơn gợi ý (Demo)',
  days: [
    { day: 'Thứ 2', meals: { breakfast: 'Phở gà', lunch: 'Cơm gạo lứt, ức gà luộc, rau bina', dinner: 'Salad cá ngừ' } },
    { day: 'Thứ 3', meals: { breakfast: 'Bún chả', lunch: 'Miến gà, rau cải', dinner: 'Trứng hấp, bông cải xanh' } },
    // Add more days as needed
  ],
  options: [
    { id: 'regen', label: 'Tạo lại thực đơn khác' },
    { id: 'details', label: 'Xem chi tiết dinh dưỡng' },
  ]
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userMessage = body.message;

    console.log('Received message on /api/multi-agent-chat:', userMessage);

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // --- Mock Response Logic --- 
    let responseContent = `Đây là phản hồi mẫu cho: "${userMessage}".`;
    let agentSteps: AgentStep[] | undefined = undefined;
    let menuData: any | undefined = undefined;
    let agentName = 'Nutrition Agent';

    // Simulate different responses based on input
    if (userMessage.toLowerCase().includes('thực đơn') || userMessage.startsWith('/menu')) {
      responseContent = 'Tôi đã tạo một thực đơn gợi ý cho bạn.';
      agentSteps = mockAgentSteps;
      menuData = mockMenuData;
      agentName = 'Menu Planner Agent';
    } else if (userMessage.toLowerCase().includes('giải thích')) {
      responseContent = `Giải thích mẫu cho "${userMessage}": Đây là một món ăn truyền thống... (chi tiết sẽ được cung cấp bởi agent chuyên môn).`;
      agentSteps = [
        { stepName: 'Nhận yêu cầu', status: 'success' }, // Removed details
        { stepName: 'Tìm kiếm thông tin', status: 'skipped' }, // Removed details
        { stepName: 'Tổng hợp giải thích', status: 'skipped' }, // Removed details
      ];
      agentName = 'Food Explainer Agent';
    } else {
       agentSteps = [
        { stepName: 'Nhận yêu cầu', status: 'success' }, // Removed details
        { stepName: 'Định tuyến yêu cầu', status: 'success' }, // Removed details
        { stepName: 'Xử lý yêu cầu', status: 'skipped' }, // Removed details
      ];
    }

    // Return the mock response
    return NextResponse.json({
      content: responseContent,
      agentName: agentName,
      agentSteps: agentSteps,
      menuData: menuData,
    });

  } catch (error) {
    console.error('Error in /api/multi-agent-chat:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
