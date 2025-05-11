export type ChatStep = 
  'greeting' | 'name' | 'gender' | 'age' | 'diet' | 'health_issues' | 
  'complete' | 'ask_recommendations' | 'show_recommendations' | 
  'ask_menu_type' | 'confirm_menu_type_day' | 'confirm_menu_type_emotion' | 'confirm_menu_type_weather' | 
  'final_complete';

// Define menu type options
export const MENU_TYPE_OPTIONS = {
  DAY: "Tạo thực đơn theo ngày",
  EMOTION: "Tạo thực đơn theo cảm xúc",
  WEATHER: "Tạo thực đơn theo thời tiết",
} as const;

type MenuTypeKey = keyof typeof MENU_TYPE_OPTIONS;
type MenuTypeValue = typeof MENU_TYPE_OPTIONS[MenuTypeKey];

// Constants for options (matching HealthInformationForm)
export const AGE_GROUPS = [
  "Dưới 18 tuổi", "Từ 18 đến 24 tuổi", "Từ 25 đến 34 tuổi", "Từ 35 đến 44 tuổi",
  "Từ 45 đến 54 tuổi", "Từ 55 đến 64 tuổi", "Trên 65 tuổi"
] as const;

export const DIET_OPTIONS = [
  "Không có",
  "Ăn chay",
  "Ăn kiêng",
  "Keto",
  "Low-carb",
  "Khác"
] as const;

export const HEALTH_ISSUES = [
  "Không có",
  "Tiểu đường",
  "Huyết áp cao",
  "Dị ứng thực phẩm",
  "Bệnh dạ dày",
  "Khác"
] as const;

export const CHAT_STEPS: Record<ChatStep, {
  message: string;
  options?: string[] | MenuTypeValue[]; // Allow for MenuTypeValue
  requiresResponse?: boolean;
  allowCustomInput?: boolean;
  dynamicOptions?: (flow: HealthChatFlow) => string[]; // For dynamic options
}> = {
  greeting: {
    message: "Chào bạn, mình là NutriCare – trợ lý dinh dưỡng của bạn. Cho mình hỏi tên bạn là gì nhỉ?",
    requiresResponse: true
  },
  name: {
    message: "Rất vui được gặp bạn {name}! Cho mình hỏi giới tính của bạn để có thể tư vấn tốt hơn nhé?",
    options: ["Nam", "Nữ"]
  },
  gender: {
    message: "Cảm ơn bạn. Bạn thuộc độ tuổi nào?",
    options: [
      "Dưới 18 tuổi",
      "Từ 18 đến 24 tuổi",
      "Từ 25 đến 34 tuổi",
      "Từ 35 đến 44 tuổi",
      "Từ 45 đến 54 tuổi",
      "Từ 55 đến 64 tuổi",
      "Trên 65 tuổi"
    ]
  },
  age: {
    message: "Bạn thuộc độ tuổi nào?",
    options: [...AGE_GROUPS]
  },
  diet: {
    message: "Bạn có đang theo chế độ ăn đặc biệt nào không?",
    options: [...DIET_OPTIONS],
    allowCustomInput: true
  },
  health_issues: {
    message: "Bạn có vấn đề sức khỏe nào cần lưu ý không?",
    options: [...HEALTH_ISSUES],
    allowCustomInput: true
  },
  complete: {
    message: "Tuyệt vời! Mình đã ghi nhận thông tin của bạn. Sẵn sàng để nhận các gợi ý món ăn chưa nào?", // Changed message to lead to API call
    requiresResponse: false // This step will be followed by an API call and then ask_recommendations
  },
  ask_recommendations: {
    message: "Mình đã có một vài gợi ý món ăn cá nhân hóa cho bạn. Bạn có muốn xem thử không?",
    options: ["Có", "Không"],
    requiresResponse: true // Requires a "Yes" or "No"
  },
  show_recommendations: { // This step is primarily a state for the UI, no static message
    message: "", // Dynamic content will be handled by UI
    requiresResponse: false
  },
  final_complete: {
    message: "Cảm ơn bạn! Nếu có bất kỳ câu hỏi nào khác về dinh dưỡng, đừng ngần ngại hỏi mình nhé.",
    requiresResponse: false
  },
  // New steps for menu type selection
  ask_menu_type: {
    message: "Bạn muốn tạo thực đơn theo tiêu chí nào trước?",
    dynamicOptions: (flow) => flow.getRemainingMenuTypeOptions(),
    requiresResponse: true,
  },
  confirm_menu_type_day: {
    message: `Đã chọn tạo thực đơn theo ngày. Bạn có muốn chọn thêm tiêu chí khác không?`,
    dynamicOptions: (flow) => flow.getRemainingMenuTypeOptionsOrSkip(),
    requiresResponse: true,
  },
  confirm_menu_type_emotion: {
    message: `Đã chọn tạo thực đơn theo cảm xúc. Bạn có muốn chọn thêm tiêu chí khác không?`,
    dynamicOptions: (flow) => flow.getRemainingMenuTypeOptionsOrSkip(),
    requiresResponse: true,
  },
  confirm_menu_type_weather: {
    message: `Đã chọn tạo thực đơn theo thời tiết. Bạn có muốn chọn thêm tiêu chí khác không?`,
    dynamicOptions: (flow) => flow.getRemainingMenuTypeOptionsOrSkip(),
    requiresResponse: true,
  }
};

export class HealthChatFlow {
  private currentStep: ChatStep = 'greeting';
  private userData: Record<string, any> = {};
  private selectedMenuTypes: MenuTypeValue[] = [];
  public menuSelectionActive: boolean = false; // To track if menu selection is active

  constructor() {
    this.resetFlow();
  }

  public getCurrentStep() {
    return this.currentStep;
  }

  public setCurrentStep(step: ChatStep) {
    this.currentStep = step;
    if (step === 'ask_menu_type' || step === 'confirm_menu_type_day' || step === 'confirm_menu_type_emotion' || step === 'confirm_menu_type_weather') {
      this.menuSelectionActive = true;
    } else {
      this.menuSelectionActive = false;
    }
  }

  public getSelectedMenuTypes(): MenuTypeValue[] {
    return this.selectedMenuTypes;
  }
  
  public getRemainingMenuTypeOptions(): MenuTypeValue[] {
    const allOptions = Object.values(MENU_TYPE_OPTIONS);
    return allOptions.filter(option => !this.selectedMenuTypes.includes(option));
  }

  public getRemainingMenuTypeOptionsOrSkip(): string[] {
    const remaining = this.getRemainingMenuTypeOptions();
    if (remaining.length === 0) {
      return ["Hoàn tất"];
    }
    return [...remaining, "Bỏ qua"];
  }


  public getCurrentMessage() {
    const stepConfig = CHAT_STEPS[this.currentStep];
    if (!stepConfig) return null;

    let message = stepConfig.message;
    if (this.currentStep === 'name' && this.userData.name) {
      message = message.replace('{name}', this.userData.name);
    }
    
    let options = stepConfig.options;
    if (stepConfig.dynamicOptions) {
      options = stepConfig.dynamicOptions(this);
    }

    return {
      message,
      options: options as string[] | undefined, // Cast because dynamicOptions returns string[]
      requiresResponse: stepConfig.requiresResponse,
      allowCustomInput: stepConfig.allowCustomInput
    };
  }

  public exitMenuSelectionFlow() {
    this.menuSelectionActive = false;
    this.currentStep = 'final_complete';
  }

  // Helper to convert single string or "Không có" to array
  private stringToArray(value: string | undefined): string[] {
    if (!value || value === 'Không có') {
      return [];
    }
    // Assuming single value from chat, wrap in array
    // If multiple values separated by comma are possible later, add split logic here
    return [value.trim()]; 
  }

  public formatUserDataForAPI() {
    if (!this.isComplete()) return null;

    // Use the helper function to ensure arrays are returned
    const formattedData = {
      gender: this.userData.gender,
      age_group: this.userData.age_group,
      // Assuming 'diet' and 'health_issues' store the string response from chat
      spefical_diet: this.stringToArray(this.userData.diet), 
      disease: this.stringToArray(this.userData.health_issues) // Match 'disease' key from form
      // Add other fields from HealthInformationForm if needed (race, income, education, symptom)
      // For now, keeping it minimal based on current chat flow
    };
    
    // Remove optional fields if they are undefined or empty arrays
     Object.keys(formattedData).forEach(key => {
       const typedKey = key as keyof typeof formattedData;
       const value = formattedData[typedKey];
       if (value === undefined || (Array.isArray(value) && value.length === 0)) {
         delete formattedData[typedKey];
       }
     });

    return formattedData;
  }

  public processUserResponse(response: string) {
    const originalStep = this.currentStep; // Keep track of step before processing

    switch (this.currentStep) {
      case 'greeting':
        if (!response.trim()) return { nextStep: this.currentStep, message: this.getCurrentMessage() };
        this.userData.name = response;
        this.setCurrentStep('name');
        break;
      case 'name':
        this.userData.gender = response;
        this.setCurrentStep('gender');
        break;
      case 'gender':
        this.userData.age_group = response;
        // this.setCurrentStep('age'); // Original flow had 'age' as a separate step, but options are same as 'gender'
                                     // Let's assume 'age' was meant to be 'diet' based on message content
        this.setCurrentStep('diet');
        break;
      // case 'age': // This step seems redundant if 'gender' already asks for age_group with same options
      //   this.userData.age_group = response; // If it was intended, it would be here
      //   this.setCurrentStep('diet');
      //   break;
      case 'diet': // This was 'age' in the original switch, but message is for diet
        this.userData.diet = response;
        this.setCurrentStep('health_issues');
        break;
      case 'health_issues': // This was 'diet' in the original switch
        this.userData.health_issues = response;
        this.setCurrentStep('complete');
        break;
      case 'ask_recommendations':
        if (response === "Có") {
          this.setCurrentStep('show_recommendations');
          // After showing recommendations, the UI will likely trigger the next step
          // For now, let's assume it transitions to ask_menu_type
          // This will be handled in ChatInterface.tsx after recommendations are displayed
        } else {
          this.setCurrentStep('final_complete');
        }
        break;
      case 'show_recommendations':
        // This step is more of a UI state. After recommendations are shown,
        // ChatInterface.tsx should advance the flow to 'ask_menu_type'.
        // For now, we don't change step here based on user response.
        // The transition to 'ask_menu_type' will happen in ChatInterface
        break;
      
      // --- New Menu Type Selection Logic ---
      case 'ask_menu_type':
      case 'confirm_menu_type_day':
      case 'confirm_menu_type_emotion':
      case 'confirm_menu_type_weather':
        // Validate response before passing to handleMenuTypeResponse
        const validMenuResponses = [...Object.values(MENU_TYPE_OPTIONS), "Bỏ qua", "Hoàn tất"];
        if (validMenuResponses.includes(response as MenuTypeValue | "Bỏ qua" | "Hoàn tất")) {
          this.handleMenuTypeResponse(response as MenuTypeValue | "Bỏ qua" | "Hoàn tất");
        } else {
          // Handle invalid response for menu type selection, perhaps by re-asking or logging
          console.warn(`Invalid menu type response: ${response}`);
          // Optionally, keep the current step or move to an error state
        }
        break;
    }
    
    // If the step didn't change (e.g. in show_recommendations or if an invalid response for a step)
    // ensure we return the current message for that step.
    // Otherwise, the message for the new step will be returned.
    return {
      nextStep: this.currentStep,
      message: this.getCurrentMessage()
    };
  }

  public getUserData() {
    return this.userData;
  }

  // isComplete now signifies that the initial data collection part of the flow is done.
  public isComplete() {
    return this.currentStep === 'complete';
  }

  public isFlowTrulyFinished() {
    // Now, flow is truly finished if all menu types are selected or user skips
    return this.currentStep === 'final_complete' || 
           (this.menuSelectionActive && this.getRemainingMenuTypeOptions().length === 0 && this.currentStep !== 'ask_menu_type');
  }

  private handleMenuTypeResponse(response: MenuTypeValue | "Bỏ qua" | "Hoàn tất") {
    if (response === "Bỏ qua" || response === "Hoàn tất") {
      this.setCurrentStep('final_complete');
      this.menuSelectionActive = false;
      return;
    }

    const selectedOption = response as MenuTypeValue;

    if (Object.values(MENU_TYPE_OPTIONS).includes(selectedOption) && !this.selectedMenuTypes.includes(selectedOption)) {
      this.selectedMenuTypes.push(selectedOption);
    }

    const remainingOptions = this.getRemainingMenuTypeOptions();
    if (remainingOptions.length === 0) {
      this.setCurrentStep('final_complete');
      this.menuSelectionActive = false;
    } else {
      // Determine next confirmation step based on what was just selected
      // This logic might need refinement if we want to strictly follow the order day -> emotion -> weather
      // For now, it just asks for more based on remaining.
      // A more robust way would be to have specific confirmation steps like 'confirm_menu_type_day_next_emotion', etc.
      // Or, simplify: after any selection, go back to 'ask_menu_type' which will show remaining.
      
      // Simplified approach: always go back to ask_menu_type if more options remain
      this.setCurrentStep('ask_menu_type'); 

      // Example of more specific next step (could be complex):
      // if (selectedOption === MENU_TYPE_OPTIONS.DAY) this.setCurrentStep('confirm_menu_type_day');
      // else if (selectedOption === MENU_TYPE_OPTIONS.EMOTION) this.setCurrentStep('confirm_menu_type_emotion');
      // else if (selectedOption === MENU_TYPE_OPTIONS.WEATHER) this.setCurrentStep('confirm_menu_type_weather');
    }
  }

  public resetFlow() {
    this.currentStep = 'greeting';
    this.userData = {};
    this.selectedMenuTypes = [];
    this.menuSelectionActive = false;
  }

  public handleGeneralResponse() {
    return this.currentStep === 'greeting' || (this.currentStep === 'name' && this.userData.name);
  }
}
