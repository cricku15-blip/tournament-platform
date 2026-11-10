export const CONTACT_TOPICS = ["General", "Payments and refunds", "Organizing a tournament", "Report a problem", "Other"] as const;

export const DEFAULT_FAQ: Array<{ group: string; q: string; a: string }> = [
  { group: "Getting started", q: "What is GroundWar?", a: "GroundWar helps local cricket and football communities run tournaments: registrations, squads, live auctions, fixtures, results and stats in one place." },
  { group: "Getting started", q: "Do I need an account to follow a tournament?", a: "No. Fixtures, standings and stats are public. You only need an account to apply, manage a team or organize." },
  { group: "Players", q: "Why do players need a subscription?", a: "The player subscription lets you apply to tournaments and auctions in your city and keeps a public profile with your stats. See Pricing for the current plan." },
  { group: "Players", q: "Can I play in a different city?", a: "Tournaments are matched to the city on your profile. You can change your city in Profile, and existing tournaments are not affected." },
  { group: "Organizers", q: "How do I run a tournament?", a: "Create a tournament, pay the one-time organizer fee for its size, publish it, approve teams and players, then generate fixtures and enter results." },
  { group: "Auctions", q: "Is auction money real?", a: "No. Auction points are virtual and only exist inside the tournament. GroundWar is not part of any money exchanged between users." },
  { group: "Payments", q: "How do refunds work?", a: "Refund rules are explained in the Refund policy. Payments are processed by Razorpay and only marked paid after verified confirmation." },
];

export const DEFAULT_LEGAL = { version: "1.0", updated: "2026-11-10" };

export const TERMS_SECTIONS: Array<{ id: string; title: string; body: string[] }> = [
  { id: "using", title: "Using GroundWar", body: ["You must be at least 13 years old. If you are under 18, a parent or guardian must agree to your use of the service.", "You are responsible for the accuracy of the information you provide and for activity on your account."] },
  { id: "tournaments", title: "Tournaments and organizers", body: ["Organizers are independent users. They are responsible for running their tournaments, including rules, prizes, fees collected outside the platform, and disputes.", "GroundWar provides software only and does not organize, supervise or guarantee any tournament."] },
  { id: "money", title: "Money between users", body: ["GroundWar is not a party to, and is not responsible for, any money exchanged between users, including entry fees, prizes or payments between players, managers and organizers.", "Payments made to GroundWar (organizer fees and player subscriptions) are processed by Razorpay and are subject to the Refund policy."] },
  { id: "auction", title: "Auction points", body: ["Auction points are virtual. They have no cash value, cannot be exchanged for money and exist only within the tournament in which they are issued."] },
  { id: "conduct", title: "Conduct and content", body: ["Do not post unlawful, abusive or misleading content. We may remove content and suspend accounts that break these rules.", "Chat messages and profiles can be reported and are reviewed by our team."] },
  { id: "liability", title: "Liability", body: ["The service is provided as is. To the extent permitted by law, GroundWar is not liable for indirect or consequential losses, or for injuries or disputes arising from matches played in real life."] },
  { id: "changes", title: "Changes", body: ["We may update these terms. Continued use after an update means you accept the new version."] },
];

export const PRIVACY_SECTIONS: Array<{ id: string; title: string; body: string[] }> = [
  { id: "collect", title: "What we collect", body: ["Account details (email, name, username, city, date of birth, optional phone number), your sport profile, tournament activity, and match statistics.", "Payment details are handled by Razorpay. We never store card numbers."] },
  { id: "visible", title: "What others can see", body: ["Your public profile shows your name, username, photo, bio, and optionally your age, city and stats, based on your visibility settings.", "Your phone number and date of birth are never shown publicly. Organizers and managers see your phone number only where needed to run a tournament."] },
  { id: "use", title: "How we use data", body: ["To run tournaments, show standings and stats, send notifications you have not turned off, prevent abuse, and meet legal obligations.", "We do not sell your personal data."] },
  { id: "rights", title: "Your choices", body: ["You can download your data and delete your account from Settings. Squad and match records stay in tournaments as an anonymous player after deletion.", "Contact us from the Contact page for any privacy request."] },
  { id: "kids", title: "Young users", body: ["GroundWar is for people aged 13 and over. Users under 18 need parental permission."] },
];

export const REFUND_SECTIONS: Array<{ id: string; title: string; body: string[] }> = [
  { id: "organizer", title: "Organizer fees", body: ["The organizer fee is charged once per tournament. If you cancel before publishing, request a refund through Contact. Once a tournament is published and teams or players have registered, the fee is not refundable unless the platform fails to deliver the service."] },
  { id: "player", title: "Player subscriptions", body: ["You can cancel any time. Your plan stays active until the end of the paid period. We do not refund partial periods unless required by law."] },
  { id: "failed", title: "Failed or duplicate payments", body: ["If you were charged but the payment shows as failed, or you were charged twice, contact us with the payment reference and we will review and refund where appropriate."] },
  { id: "how", title: "How refunds are paid", body: ["Approved refunds go back to the original payment method through Razorpay and usually take 5 to 7 working days."] },
];
