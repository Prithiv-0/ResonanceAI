// ============================================================
// RESONANCE Studio Booth — Scenario Bank (Client Copy)
// Mirrors the backend's scenario bank for offline display.
// ============================================================

import type { Scenario } from '../types';

/**
 * Full scenario bank. Each scenario has:
 * - id: unique identifier
 * - text: the situational prompt shown to the participant
 * - instruction: brief direction for how to respond
 *
 * NOTE: intended_emotion is deliberately NOT included here.
 * The participant should not be primed about what emotion they're
 * "supposed" to feel. The self-report after recording is the ground truth.
 */
export const SCENARIO_BANK: Scenario[] = [
  // ── ANGER-targeted scenarios ──
  {
    id: 'ANG_01',
    text: 'You just found out your group project partner submitted a completely wrong version of your shared assignment — the deadline was an hour ago and you can\'t resubmit. Call them.',
    instruction: 'Respond as if you\'re calling your partner right now.',
  },
  {
    id: 'ANG_02',
    text: 'A delivery driver marked your expensive package as \'delivered\' but it\'s nowhere to be found. You\'re now on the phone with customer support for the third time.',
    instruction: 'Speak as if you\'re talking to the support agent.',
  },
  {
    id: 'ANG_03',
    text: 'Someone just cut in front of you in a long queue you\'ve been standing in for 30 minutes. They pretend they didn\'t notice. Confront them.',
    instruction: 'Address the person who cut in line.',
  },
  {
    id: 'ANG_04',
    text: 'Your landlord has increased the rent by 40% with only one week\'s notice, even though your lease says they need two months. Call them to argue.',
    instruction: 'Speak as if you\'re on the phone with your landlord.',
  },
  {
    id: 'ANG_05',
    text: 'You stayed late at work to finish a presentation, and your manager just took full credit for it in front of the entire team. Vent to a colleague.',
    instruction: 'Tell your colleague what just happened.',
  },
  {
    id: 'ANG_06',
    text: 'Your neighbour\'s car alarm has been going off every night for a week. It\'s 2 AM and it just started again. You go knock on their door.',
    instruction: 'Speak as if you\'ve just opened their door.',
  },
  {
    id: 'ANG_07',
    text: 'You lent a significant amount of money to a friend six months ago. They just posted vacation photos and when you asked about the money, they said \'I\'ll get to it.\' Respond.',
    instruction: 'Reply to your friend.',
  },

  // ── DISGUST-targeted scenarios ──
  {
    id: 'DIS_01',
    text: 'You open the fridge and find your roommate\'s week-old leftover fish has leaked all over your fresh groceries. The smell is overwhelming. Tell them about it.',
    instruction: 'Describe the situation to your roommate.',
  },
  {
    id: 'DIS_02',
    text: 'Someone at work keeps taking credit for your ideas in meetings and just did it again — smiling at the boss while presenting your exact proposal. Describe the situation to a friend.',
    instruction: 'Tell your friend what happened.',
  },
  {
    id: 'DIS_03',
    text: 'You\'re eating at a restaurant and find a long hair cooked into your food. When you show the waiter, they suggest you just eat around it. React.',
    instruction: 'Respond to the waiter.',
  },
  {
    id: 'DIS_04',
    text: 'You just discovered that the \'organic, locally-sourced\' food brand you\'ve been paying premium prices for has been caught relabelling cheap imported products. Tell someone.',
    instruction: 'Share this with someone you know.',
  },
  {
    id: 'DIS_05',
    text: 'You\'re on public transport and the person next to you is clipping their toenails and letting the clippings fall on the floor. Describe this to a friend on the phone.',
    instruction: 'Describe what you\'re witnessing.',
  },
  {
    id: 'DIS_06',
    text: 'A politician you once respected was just caught lying about their qualifications and using donations for personal luxury purchases. React to the news.',
    instruction: 'Express your reaction to someone.',
  },
  {
    id: 'DIS_07',
    text: 'You found out that a popular influencer has been secretly buying fake followers and fake reviews, and brands are still paying them. Talk about it.',
    instruction: 'Share your reaction with a friend.',
  },

  // ── FEAR-targeted scenarios ──
  {
    id: 'FEA_01',
    text: 'You\'re home alone at night and hear the back door handle slowly turning. You know you locked it. Call a friend and describe what\'s happening.',
    instruction: 'Whisper or speak urgently to your friend on the phone.',
  },
  {
    id: 'FEA_02',
    text: 'You just realized you sent a very personal, embarrassing message meant for one person to your entire class or work group chat. It\'s been seen by 40 people. Tell someone what happened.',
    instruction: 'Describe the situation to a friend.',
  },
  {
    id: 'FEA_03',
    text: 'You\'re driving on a highway at night and your car starts making a loud grinding noise. The engine warning light just came on and you\'re 50 km from the nearest town. Call someone.',
    instruction: 'Call someone and describe your situation.',
  },
  {
    id: 'FEA_04',
    text: 'You just received a notification that someone logged into your bank account from an unknown device in another country. Tell someone.',
    instruction: 'Describe what you\'re seeing to someone nearby.',
  },
  {
    id: 'FEA_05',
    text: 'You\'re about to give a major presentation to 200 people and you just realized your slides are corrupted and won\'t open. The host is introducing you right now. React.',
    instruction: 'Express your panic to a colleague backstage.',
  },
  {
    id: 'FEA_06',
    text: 'You\'re walking through a dark parking garage late at night and you hear footsteps behind you that speed up when you speed up. Call someone.',
    instruction: 'Speak quietly and urgently.',
  },
  {
    id: 'FEA_07',
    text: 'Your doctor just called and said they need you to come back for more tests because something \'unusual\' showed up in your routine blood work. They can\'t tell you more over the phone. Tell a family member.',
    instruction: 'Describe what the doctor said.',
  },

  // ── HAPPINESS-targeted scenarios ──
  {
    id: 'HAP_01',
    text: 'You just got an email saying you\'ve been selected for your dream internship out of 500 applicants. Call your best friend to share the news.',
    instruction: 'Share the exciting news with your friend.',
  },
  {
    id: 'HAP_02',
    text: 'Your pet who went missing three days ago was just found safe and healthy and is being brought back to you right now. Someone asks how you\'re feeling.',
    instruction: 'Describe how you feel.',
  },
  {
    id: 'HAP_03',
    text: 'You just found out that a surprise party your friends have been secretly planning for your birthday is happening tonight. You walked in on the decorations. React.',
    instruction: 'Express your surprise and joy.',
  },
  {
    id: 'HAP_04',
    text: 'After months of practice, you just performed on stage and the audience gave you a standing ovation. You\'re backstage calling your parents.',
    instruction: 'Tell your parents what just happened.',
  },
  {
    id: 'HAP_05',
    text: 'You\'ve been saving for a year and you just made the final payment on a debt that\'s been stressing you out. Tell someone about it.',
    instruction: 'Share the relief and happiness.',
  },
  {
    id: 'HAP_06',
    text: 'A student you\'ve been tutoring for months just told you they passed the exam they were failing — they\'re the first in their family to pass. They\'re thanking you. Respond.',
    instruction: 'Respond to their thanks.',
  },
  {
    id: 'HAP_07',
    text: 'You just reunited with a childhood best friend you haven\'t seen in 10 years. You bump into them unexpectedly at a coffee shop. React.',
    instruction: 'Greet them and react.',
  },

  // ── SADNESS-targeted scenarios ──
  {
    id: 'SAD_01',
    text: 'Your closest friend just told you they\'re moving to another country permanently. You\'re on the phone saying goodbye, knowing you might not see them for years.',
    instruction: 'Say your goodbye.',
  },
  {
    id: 'SAD_02',
    text: 'You spent months preparing for a competition — practicing every day — and you just found out you didn\'t even make it past the first round. Tell someone about it.',
    instruction: 'Share what happened.',
  },
  {
    id: 'SAD_03',
    text: 'You just found an old voicemail from a grandparent who passed away last year. Hearing their voice brought everything back. Describe how you feel to someone.',
    instruction: 'Describe your feelings.',
  },
  {
    id: 'SAD_04',
    text: 'The animal shelter just called to say the dog you\'ve been visiting and hoping to adopt was adopted by someone else this morning. React.',
    instruction: 'React to the news.',
  },
  {
    id: 'SAD_05',
    text: 'You just learned that a teacher who made a huge positive impact on your life during school has passed away. Tell a classmate the news.',
    instruction: 'Share the news with your classmate.',
  },
  {
    id: 'SAD_06',
    text: 'You\'re packing up your childhood room because your family is selling the house you grew up in. Describe what you\'re feeling.',
    instruction: 'Express your feelings about leaving.',
  },
  {
    id: 'SAD_07',
    text: 'Your long-distance partner just told you they think the distance is too hard and they want to take a break. Respond to them.',
    instruction: 'Respond to what they said.',
  },

  // ── NEUTRAL-targeted scenarios ──
  {
    id: 'NEU_01',
    text: 'You need to call the electricity office to report your meter reading. Say: \'My consumer number is 4-4-7-2-9-0 and the current reading is 2-8-5-1 units.\'',
    instruction: 'Read the information clearly and naturally.',
  },
  {
    id: 'NEU_02',
    text: 'A friend asks you for directions from the main gate to the library. Give them step-by-step walking directions.',
    instruction: 'Give clear, calm directions.',
  },
  {
    id: 'NEU_03',
    text: 'You\'re leaving a voicemail for a doctor\'s office to confirm your appointment. Say the date, time, and your name.',
    instruction: 'Leave a standard voicemail.',
  },
  {
    id: 'NEU_04',
    text: 'Someone asks you to describe your daily morning routine. Walk them through what you typically do from waking up to leaving the house.',
    instruction: 'Describe your routine matter-of-factly.',
  },
  {
    id: 'NEU_05',
    text: 'You\'re helping someone set up their new phone. Explain to them how to connect to Wi-Fi, step by step.',
    instruction: 'Give clear, patient instructions.',
  },
  {
    id: 'NEU_06',
    text: 'A colleague asks what the weather is like today. Look outside and describe what you see — sky, temperature, wind.',
    instruction: 'Describe the weather objectively.',
  },
  {
    id: 'NEU_07',
    text: 'You\'re ordering food over the phone. Tell the restaurant: \'I\'d like one margherita pizza, a garden salad, and two bottles of water for delivery to 14 Park Street.\'',
    instruction: 'Place the order naturally.',
  },
];
