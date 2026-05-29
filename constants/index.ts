import chat from "@/assets/icons/chat.png";
import home from "@/assets/icons/home.png";
import list from "@/assets/icons/list.png";
import profile from "@/assets/icons/profile.png";

import onboarding1 from "@/assets/images/onboarding1.png";
import onboarding2 from "@/assets/images/onboarding2.png";
import onboarding3 from "@/assets/images/onboarding3.png";

export const images = {
  onboarding1,
  onboarding2,
  onboarding3,
};

//

export const icons = {
  chat,
  home,
  list,
  profile,
};

export const onboarding = [
  {
    id: 1,
    title: "The perfect ride is just a tap away! Earn more effortlessly.",
    description:
      "በአዳዲስ ፊቸሮቻችን እስከ 30 percent ተጨማሪ ገቢ ያግኙ!",
    image: images.onboarding1,
  },
  {
    id: 2,
    title: "ተጠቃሚዎችን በደንብ በማስተናገድ ደንበኛ የመደረግ ዕድሎን ያስፉ!",
    description:
      "በShare ተጠቃሚዎች አገልግሎትዎን ሲወዱ, እርሶን ደንበኛ ማድረግ ይችላሉ:: ይህም ማለት ቀጣይ ራይድ ሲጠይቁ ከእርሱ ጋር match ይደረጋሉ!!",
    image: images.onboarding2,
  },
  {
    id: 3,
    title: "Your ride, your way. Let's go!",
    description:
      "With Share, waiting time penalty is enabled. Just sit back, relax and we'll take care of the rest!",
    image: images.onboarding3,
  },
];

export const data = {
  onboarding,
};
