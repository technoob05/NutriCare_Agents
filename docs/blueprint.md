# **App Name**: Vietnamese Diet Planner

## Core Features:

- Preference Gathering: Chatbot interface to gather user preferences (daily or weekly menu). Uses Gemini API Key (AIzaSyCwg1omBoK9kSWwmjJ3BWFb0CO7oEAAJVU) to parse requests.
- Menu Generation: Generates a menu based on user preferences (daily/weekly) using a planning agent. The LLM uses tool use to integrate Google Search results for grounding of information. Uses google-adk for dev.
- Menu Display: Displays the generated menu in a user-friendly, interactive format. Each meal includes preparation instructions, ingredient list, and estimated cost.
- Feedback Collection: Allows users to provide feedback on generated menus.
- Memory: Stores user preferences and feedback for future sessions using local storage.

## Style Guidelines:

- Primary color: Light green (#E8F5E9) to represent health and freshness.
- Secondary color: Off-white (#FAFAFA) for a clean and modern look.
- Accent color: Light Orange (#FFCC80) for interactive elements and call to actions.
- Clean and readable typography for displaying recipes and instructions.
- Simple and intuitive icons for menu options and dietary information.
- Clean layout with clear sections for chat, menu display, and user feedback.

## Original User Request:
Xây Dựng Hệ Thống Web Multiple Agents Cho Thực Đơn Sức Khỏe Nếu được hãy dùng backend bằng python langchain kết hợp với api gemini , giao diện bằng nexts , (tạo nextjs bằng create nextjs lastest gì đó )  Nhớ đưa tôi code chi tiết đầy đủ để tôi copy chạy : 

Giao diện tham khảo gemeni và notebookLm ( chuẩn UX UI ) 
Lưu ý :  Ưu tiên dùng công nghệ của google hay các framework tích hợp tốt với các dịch vụ của google . Bỏ cái fact checking đi mà hãy thêm grounding với với google search  :
from google import genai
from google.genai.types import Tool, GenerateContentConfig, GoogleSearch

client = genai.Client()
model_id = "gemini-2.0-flash"

google_search_tool = Tool(
    google_search = GoogleSearch()
)

response = client.models.generate_content(
    model=model_id,
    contents="When is the next total solar eclipse in the United States?",
    config=GenerateContentConfig(
        tools=[google_search_tool],
        response_modalities=["TEXT"],
    )
)

for each in response.candidates[0].content.parts:
    print(each.text)
# Example response:
# The next total solar eclipse visible in the contiguous United States will be on ...

# To get grounding metadata as web content.
print(response.candidates[0].grounding_metadata.search_entry_point.rendered_content) 
Dùng API KEY của gemeni : AIzaSyCwg1omBoK9kSWwmjJ3BWFb0CO7oEAAJVU
Bối cảnh: Bạn đang phát triển một hệ thống recommendation chuyên về ẩm thực và sức khỏe cho người Việt, tập trung vào món ăn Việt. Hệ thống đã có sẵn output từ Recommendation System với khoảng 50–100 món ăn được sắp xếp theo điểm số và được nhóm theo các bữa: sáng, trưa, chiều, tối. Mỗi món ăn bao gồm các thông tin chi tiết như: cách chế biến, danh sách nguyên liệu (từ dạng tổng quát như “thịt gà” đến chi tiết như lượng sodium, carbohydrate), và cả giá tiền.
Nhiệm vụ: Xây dựng một hệ thống web sử dụng kiến trúc Multiple Agents với giao diện chat bot, nhằm cung cấp trải nghiệm tương tác và thân thiện cho người dùng, đặc biệt là những người mới bắt đầu. Hệ thống cần thực hiện các chức năng sau:
Tùy chọn Thực Đơn:
Khi người dùng truy cập, giao diện chat bot hiển thị các lựa chọn: “Thực đơn theo ngày” hoặc “Thực đơn theo tuần”. Xác Thực Thông Tin (Fact Checking):
Sau khi người dùng lựa chọn, hệ thống sẽ tiến hành tra cứu, xác minh các thông tin liên quan đến món ăn. Việc này có thể tích hợp các link ưu tiên từ các nguồn web đáng tin cậy. RAG (Retrieval Augmented Generation):
Áp dụng RAG để đảm bảo hệ thống giữ vững nguyên tắc cốt lõi, kết hợp thông tin tra cứu với dữ liệu từ Recommendation System. Reasoning và Planning Agent:
Một agent chuyên trách thực hiện quá trình suy luận và lập kế hoạch dựa trên dữ liệu đã được xác thực và RAG, nhằm tối ưu hoá việc phân chia thực đơn cho các bữa trong ngày hoặc theo tuần. Content Writing Agent:
Dựa trên kết quả từ quá trình reasoning và planning, agent này sẽ soạn lại nội dung thực đơn, trình bày thông tin một cách hấp dẫn, dễ hiểu và phù hợp với đối tượng người dùng. UX/UI Coding Agent:
Cuối cùng, một agent chuyên về UX/UI sẽ chuyển đổi nội dung thực đơn thành một lịch trình ăn uống chuẩn HTML (hoặc ngôn ngữ front-end khác) với giao diện thân thiện, tối ưu trải nghiệm người dùng. Lịch trình này cần có khả năng tương tác, cho phép người dùng chat, đưa ra phản hồi hoặc đặt câu hỏi thêm. Tính Năng Memory:
Hệ thống cần có bộ nhớ để lưu lại lịch sử tương tác, giúp cải thiện trải nghiệm người dùng trong các phiên làm việc sau. Yêu Cầu Kỹ Thuật:
Tích hợp đa Agent: Phân công rõ ràng vai trò của từng agent trong hệ thống (Fact Checking, RAG, Reasoning & Planning, Content Writing, UX/UI Coding). Giao diện Chat Bot: Thiết kế giao diện chat tương tác để người dùng dễ dàng lựa chọn và nhận phản hồi theo thời gian thực. Kiểm chứng thông tin: Sử dụng các nguồn đáng tin cậy (có thể gán link) để xác minh dữ liệu thực đơn. Phản hồi và Memory: Hệ thống không chỉ tạo ra lịch thực đơn mà còn cho phép người dùng tương tác, đưa ra phản hồi và có khả năng lưu trữ thông tin phiên trước. Mục tiêu cuối cùng: Tạo ra một hệ thống web tích hợp nhiều agent với khả năng:
Xây dựng thực đơn theo yêu cầu của người dùng (theo ngày hoặc theo tuần) dựa trên output của Recommendation System. Cung cấp trải nghiệm người dùng tương tác, dễ sử dụng với giao diện chat bot. Đảm bảo tính chính xác, đáng tin cậy của thông tin thông qua các bước fact checking và RAG. Hiển thị kết quả cuối cùng dưới dạng lịch trình ăn uống chuẩn UX/UI với khả năng tương tác và lưu trữ lịch sử phản hồi. # Hệ Thống Web Multiple Agents Cho Thực Đơn Sức Khỏe
  