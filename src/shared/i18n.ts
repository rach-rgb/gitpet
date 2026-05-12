export type Locale = 'ko' | 'en';

export const translations = {
  ko: {
    // Navigation
    nav_dashboard: "대시보드",
    nav_guide: "육성 가이드",
    nav_logout: "로그아웃",
    nav_login: "GitHub로 시작하기",
    
    // Home Page
    home_title: "코드로 키우는 나만의 펫 👾",
    home_subtitle: "GitChi는 당신의 GitHub 활동을 통해 가상 동료를 성장시키는 게임입니다.",
    home_card1_title: "커밋으로 먹이 주기",
    home_card1_desc: "일일 커밋은 포만감으로 전환되어 펫의 건강을 유지해줍니다.",
    home_card2_title: "특성 잠금 해제",
    home_card2_desc: "코딩 스타일에 따라 펫은 고유한 특성을 가지고 진화합니다.",
    
    // Dashboard
    dash_activity: "최근 활동",
    dash_no_activity: "최근 활동이 없습니다. 코딩을 시작해 펫을 키워보세요!",
    dash_share_title: "GitHub 프로필에 공유하기 🚀",
    dash_share_desc: "이 스니펫을 복사하여 GitHub 프로필 README에 붙여넣으세요:",
    dash_copied: "클립보드에 복사되었습니다!",
    dash_how_to: "프로필에 어떻게 추가하나요?",
    dash_step1: "나의 GitHub 프로필로 이동합니다.",
    dash_step2: "사용자 이름과 동일한 이름의 저장소를 편집하거나 생성합니다. (예: username/username)",
    dash_step3: "README.md 파일에 스니펫을 붙여넣고 저장하세요!",
    dash_sync_info: "최근 활동은 최대 30분 간격으로 자동 반영됩니다.",
    dash_danger_zone: "위험 구역",
    dash_danger_desc: "이 작업은 영구적이며 취소할 수 없습니다. 모든 데이터가 즉시 삭제됩니다.",
    dash_btn_restart: "펫 초기화",
    dash_btn_delete: "계정 삭제",
    dash_btn_retire: "펫 은퇴시키기",
    
    // Onboarding
    onboard_title: "나의 GitChi 입양하기",
    onboard_desc: "새로운 동료에게 이름을 지어주고 난이도를 선택하세요. 난이도는 펫을 행복하게 유지하기 위해 필요한 코드 양에 영향을 줍니다!",
    onboard_label_name: "펫 이름",
    onboard_label_diff: "난이도",
    onboard_diff_easy: "쉬움 (캐주얼 코더)",
    onboard_diff_normal: "보통 (표준 활동량)",
    onboard_diff_hard: "어려움 (하드코어 커미터)",
    onboard_btn_submit: "입양 완료",
    
    // Guide
    guide_title: "펫 육성 가이드 👾",
    guide_subtitle: "GitChi는 실제 GitHub 활동으로 구동됩니다. 펫을 건강하게 키우기 위해 알아야 할 모든 것을 안내해 드립니다.",
    guide_stats_title: "📊 능력치 이해하기",
    guide_fullness: "포만감",
    guide_fullness_desc: "하루에 10점씩 감소합니다. 커밋을 푸시하여 먹이를 주세요.",
    guide_happiness: "행복도",
    guide_happiness_desc: "PR 리뷰, 이슈 해결 등 협업 활동으로 오릅니다.",
    guide_xp: "경험치(XP)",
    guide_xp_desc: "시간이 지남에 따라 쌓이며 펫을 진화시키는 데 사용됩니다.",
    
    // Difficulty
    guide_diff_title: "⚙️ 난이도 시스템",
    guide_diff_desc: "선택한 난이도에 따라 펫의 수치 감소 속도와 경험치 획득량이 달라집니다.",
    guide_diff_table_easy: "감소율 0.5배 / XP 1.2배",
    guide_diff_table_normal: "표준 (감소율 1배 / XP 1배)",
    guide_diff_table_hard: "감소율 2배 / XP 0.8배",
    
    // Interaction Table
    guide_table_title: "⚔️ 활동 매핑",
    guide_table_desc: "GitHub에서 다음 활동을 수행하여 펫의 능력치를 높이세요:",
    guide_action: "활동",
    guide_bonus: "보너스",
    action_push: "푸시 (커밋)",
    action_pr_open: "PR 생성",
    action_pr_merge: "PR 머지",
    action_review: "코드 리뷰",
    
    // Lifecycle
    guide_life_title: "🧬 라이프사이클 및 진화",
    stage0_name: "알 (Egg)",
    stage0_desc: "모든 여정의 시작입니다. 첫 번째 커밋을 하면 부화합니다.",
    stage1_name: "새끼 (Hatchling)",
    stage1_desc: "경험치 1 XP 달성 시 도달. 펫이 알에서 깨어나 활동을 시작합니다.",
    stage2_name: "청소년 (Fledgling)",
    stage2_desc: "경험치 150 XP 및 10일 경과 시 도달. 이 단계에서 코딩 스타일에 따른 '특성'이 고정됩니다.",
    stage3_name: "성체 (Adult)",
    stage3_desc: "경험치 600 XP 및 30일 경과 시 도달. 펫이 완전히 성장하여 성숙한 모습을 보여줍니다.",
    stage4_name: "장로 (Elder)",
    stage4_desc: "경험치 1500 XP 및 90일 경과 시 도달. 최종 진화 단계이며, 은퇴가 가능해집니다."
  },
  en: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_guide: "Raising Guide",
    nav_logout: "Logout",
    nav_login: "Start with GitHub",
    
    // Home Page
    home_title: "Grow your Pet with Code 👾",
    home_subtitle: "GitChi uses your GitHub activity to feed and level up your virtual companion.",
    home_card1_title: "Commit to Feed",
    home_card1_desc: "Daily commits translate to hunger points, keeping your pet healthy.",
    home_card2_title: "Unlock Traits",
    home_card2_desc: "Depending on your coding style, your pet evolves with unique traits.",
    
    // Dashboard
    dash_activity: "Recent Activity",
    dash_no_activity: "No recent activity. Start coding to grow your pet!",
    dash_share_title: "Share on GitHub Profile 🚀",
    dash_share_desc: "Copy this snippet to your GitHub profile README:",
    dash_copied: "Copied to clipboard!",
    dash_how_to: "How to add to your profile?",
    dash_step1: "Go to your GitHub Profile.",
    dash_step2: "Edit or create a repository named exactly like your username (e.g., username/username).",
    dash_step3: "Paste the snippet into README.md and save!",
    dash_sync_info: "Recent activity is automatically updated every 30 minutes.",
    dash_danger_zone: "Danger Zone",
    dash_danger_desc: "These actions are permanent and cannot be undone. All data will be removed.",
    dash_btn_restart: "Restart Pet",
    dash_btn_delete: "Delete Account",
    dash_btn_retire: "Retire Pet",
    
    // Onboarding
    onboard_title: "Adopt your GitChi",
    onboard_desc: "Give your new companion a name and choose a difficulty level. Difficulty affects how much code you need to write to keep them happy!",
    onboard_label_name: "Pet Name",
    onboard_label_diff: "Difficulty",
    onboard_diff_easy: "Easy (Casual coder)",
    onboard_diff_normal: "Normal (Standard activity)",
    onboard_diff_hard: "Hard (Hardcore committer)",
    onboard_btn_submit: "Finalize Adoption",
    
    // Guide
    guide_title: "Pet Raising Guide 👾",
    guide_subtitle: "GitChi is powered by your real-world GitHub activity. Here is everything you need to know to keep your companion thriving.",
    guide_stats_title: "📊 Understanding Stats",
    guide_fullness: "Fullness",
    guide_fullness_desc: "Decreases by 10 pts per day. Feed it by pushing commits.",
    guide_happiness: "Happiness",
    guide_happiness_desc: "Increases through collaborative actions like PRs and reviews.",
    guide_xp: "XP",
    guide_xp_desc: "Accumulates over time to level up and evolve your pet.",

    // Difficulty
    guide_diff_title: "⚙️ Difficulty System",
    guide_diff_desc: "Your chosen difficulty affects how fast stats decay and how much XP you earn.",
    guide_diff_table_easy: "0.5x Decay / 1.2x XP Gain",
    guide_diff_table_normal: "Standard (1x Decay / 1x XP)",
    guide_diff_table_hard: "2x Decay / 0.8x XP Gain",
    
    // Interaction Table
    guide_table_title: "⚔️ Interaction Map",
    guide_table_desc: "Perform these actions on GitHub to boost your pet's stats:",
    guide_action: "Action",
    guide_bonus: "Bonus",
    action_push: "Push (Commit)",
    action_pr_open: "PR Opened",
    action_pr_merge: "PR Merged",
    action_review: "Code Review",
    
    // Lifecycle
    guide_life_title: "🧬 Lifecycle & Evolution",
    stage0_name: "Egg",
    stage0_desc: "The beginning of your journey. Hatches on your first commit.",
    stage1_name: "Hatchling",
    stage1_desc: "Reached at 1 XP. The pet hatches and starts its journey.",
    stage2_name: "Fledgling",
    stage2_desc: "Reached at 150 XP and 10 days. This is where your coding personality (Trait) is locked.",
    stage3_name: "Adult",
    stage3_desc: "Reached at 600 XP and 30 days. Your pet becomes fully grown and shows its maturity.",
    stage4_name: "Elder",
    stage4_desc: "Reached at 1500 XP and 90 days. The final evolution stage, eligible for retirement."
  }
};

export function getT(locale: Locale) {
  return (key: keyof typeof translations['ko']) => translations[locale][key] || translations['en'][key];
}
