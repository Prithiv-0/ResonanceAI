"""
RESONANCE Studio Booth — Scenario Prompt Bank

Curated situational prompts designed to naturally elicit specific emotions
through spontaneous speech. Unlike RAVDESS/CREMA-D where actors read scripted
sentences in pretend emotions, participants here read a vivid scenario and
respond as if they're actually in that situation.

Key design principle: the 'intended_emotion' is used ONLY for balancing the
prompt queue. The actual ground-truth label is the speaker's self-report
(collected after recording on the Annotate page).
"""

import random
from dataclasses import dataclass

from config import EMOTIONS, SCENARIOS_PER_EMOTION


@dataclass
class Scenario:
    id: str
    text: str
    intended_emotion: str
    instruction: str


# ── Scenario Bank ──
# ~7 scenarios per emotion = 42 total, drawn from to build balanced sessions

SCENARIO_BANK: list[Scenario] = [
    # ── ANGER ──
    Scenario(
        id="ANG_01",
        text="You just found out your group project partner submitted a completely wrong version of your shared assignment — the deadline was an hour ago and you can't resubmit. Call them.",
        intended_emotion="Anger",
        instruction="Respond as if you're calling your partner right now.",
    ),
    Scenario(
        id="ANG_02",
        text="A delivery driver marked your expensive package as 'delivered' but it's nowhere to be found. You're now on the phone with customer support for the third time.",
        intended_emotion="Anger",
        instruction="Speak as if you're talking to the support agent.",
    ),
    Scenario(
        id="ANG_03",
        text="Someone just cut in front of you in a long queue you've been standing in for 30 minutes. They pretend they didn't notice. Confront them.",
        intended_emotion="Anger",
        instruction="Address the person who cut in line.",
    ),
    Scenario(
        id="ANG_04",
        text="Your landlord has increased the rent by 40% with only one week's notice, even though your lease says they need two months. Call them to argue.",
        intended_emotion="Anger",
        instruction="Speak as if you're on the phone with your landlord.",
    ),
    Scenario(
        id="ANG_05",
        text="You stayed late at work to finish a presentation, and your manager just took full credit for it in front of the entire team. Vent to a colleague.",
        intended_emotion="Anger",
        instruction="Tell your colleague what just happened.",
    ),
    Scenario(
        id="ANG_06",
        text="Your neighbour's car alarm has been going off every night for a week. It's 2 AM and it just started again. You go knock on their door.",
        intended_emotion="Anger",
        instruction="Speak as if you've just opened their door.",
    ),
    Scenario(
        id="ANG_07",
        text="You lent a significant amount of money to a friend six months ago. They just posted vacation photos and when you asked about the money, they said 'I'll get to it.' Respond.",
        intended_emotion="Anger",
        instruction="Reply to your friend.",
    ),

    # ── DISGUST ──
    Scenario(
        id="DIS_01",
        text="You open the fridge and find your roommate's week-old leftover fish has leaked all over your fresh groceries. The smell is overwhelming. Tell them about it.",
        intended_emotion="Disgust",
        instruction="Describe the situation to your roommate.",
    ),
    Scenario(
        id="DIS_02",
        text="Someone at work keeps taking credit for your ideas in meetings and just did it again — smiling at the boss while presenting your exact proposal. Describe the situation to a friend.",
        intended_emotion="Disgust",
        instruction="Tell your friend what happened.",
    ),
    Scenario(
        id="DIS_03",
        text="You're eating at a restaurant and find a long hair cooked into your food. When you show the waiter, they suggest you just eat around it. React.",
        intended_emotion="Disgust",
        instruction="Respond to the waiter.",
    ),
    Scenario(
        id="DIS_04",
        text="You just discovered that the 'organic, locally-sourced' food brand you've been paying premium prices for has been caught relabelling cheap imported products. Tell someone.",
        intended_emotion="Disgust",
        instruction="Share this with someone you know.",
    ),
    Scenario(
        id="DIS_05",
        text="You're on public transport and the person next to you is clipping their toenails and letting the clippings fall on the floor. Describe this to a friend on the phone.",
        intended_emotion="Disgust",
        instruction="Describe what you're witnessing.",
    ),
    Scenario(
        id="DIS_06",
        text="A politician you once respected was just caught lying about their qualifications and using donations for personal luxury purchases. React to the news.",
        intended_emotion="Disgust",
        instruction="Express your reaction to someone.",
    ),
    Scenario(
        id="DIS_07",
        text="You found out that a popular influencer has been secretly buying fake followers and fake reviews, and brands are still paying them. Talk about it.",
        intended_emotion="Disgust",
        instruction="Share your reaction with a friend.",
    ),

    # ── FEAR ──
    Scenario(
        id="FEA_01",
        text="You're home alone at night and hear the back door handle slowly turning. You know you locked it. Call a friend and describe what's happening.",
        intended_emotion="Fear",
        instruction="Whisper or speak urgently to your friend on the phone.",
    ),
    Scenario(
        id="FEA_02",
        text="You just realized you sent a very personal, embarrassing message meant for one person to your entire class or work group chat. It's been seen by 40 people. Tell someone what happened.",
        intended_emotion="Fear",
        instruction="Describe the situation to a friend.",
    ),
    Scenario(
        id="FEA_03",
        text="You're driving on a highway at night and your car starts making a loud grinding noise. The engine warning light just came on and you're 50 km from the nearest town. Call someone.",
        intended_emotion="Fear",
        instruction="Call someone and describe your situation.",
    ),
    Scenario(
        id="FEA_04",
        text="You just received a notification that someone logged into your bank account from an unknown device in another country. Tell someone.",
        intended_emotion="Fear",
        instruction="Describe what you're seeing to someone nearby.",
    ),
    Scenario(
        id="FEA_05",
        text="You're about to give a major presentation to 200 people and you just realized your slides are corrupted and won't open. The host is introducing you right now. React.",
        intended_emotion="Fear",
        instruction="Express your panic to a colleague backstage.",
    ),
    Scenario(
        id="FEA_06",
        text="You're walking through a dark parking garage late at night and you hear footsteps behind you that speed up when you speed up. Call someone.",
        intended_emotion="Fear",
        instruction="Speak quietly and urgently.",
    ),
    Scenario(
        id="FEA_07",
        text="Your doctor just called and said they need you to come back for more tests because something 'unusual' showed up in your routine blood work. They can't tell you more over the phone. Tell a family member.",
        intended_emotion="Fear",
        instruction="Describe what the doctor said.",
    ),

    # ── HAPPINESS ──
    Scenario(
        id="HAP_01",
        text="You just got an email saying you've been selected for your dream internship out of 500 applicants. Call your best friend to share the news.",
        intended_emotion="Happiness",
        instruction="Share the exciting news with your friend.",
    ),
    Scenario(
        id="HAP_02",
        text="Your pet who went missing three days ago was just found safe and healthy and is being brought back to you right now. Someone asks how you're feeling.",
        intended_emotion="Happiness",
        instruction="Describe how you feel.",
    ),
    Scenario(
        id="HAP_03",
        text="You just found out that a surprise party your friends have been secretly planning for your birthday is happening tonight. You walked in on the decorations. React.",
        intended_emotion="Happiness",
        instruction="Express your surprise and joy.",
    ),
    Scenario(
        id="HAP_04",
        text="After months of practice, you just performed on stage and the audience gave you a standing ovation. You're backstage calling your parents.",
        intended_emotion="Happiness",
        instruction="Tell your parents what just happened.",
    ),
    Scenario(
        id="HAP_05",
        text="You've been saving for a year and you just made the final payment on a debt that's been stressing you out. Tell someone about it.",
        intended_emotion="Happiness",
        instruction="Share the relief and happiness.",
    ),
    Scenario(
        id="HAP_06",
        text="A student you've been tutoring for months just told you they passed the exam they were failing — they're the first in their family to pass. They're thanking you. Respond.",
        intended_emotion="Happiness",
        instruction="Respond to their thanks.",
    ),
    Scenario(
        id="HAP_07",
        text="You just reunited with a childhood best friend you haven't seen in 10 years. You bump into them unexpectedly at a coffee shop. React.",
        intended_emotion="Happiness",
        instruction="Greet them and react.",
    ),

    # ── SADNESS ──
    Scenario(
        id="SAD_01",
        text="Your closest friend just told you they're moving to another country permanently. You're on the phone saying goodbye, knowing you might not see them for years.",
        intended_emotion="Sadness",
        instruction="Say your goodbye.",
    ),
    Scenario(
        id="SAD_02",
        text="You spent months preparing for a competition — practicing every day — and you just found out you didn't even make it past the first round. Tell someone about it.",
        intended_emotion="Sadness",
        instruction="Share what happened.",
    ),
    Scenario(
        id="SAD_03",
        text="You just found an old voicemail from a grandparent who passed away last year. Hearing their voice brought everything back. Describe how you feel to someone.",
        intended_emotion="Sadness",
        instruction="Describe your feelings.",
    ),
    Scenario(
        id="SAD_04",
        text="The animal shelter just called to say the dog you've been visiting and hoping to adopt was adopted by someone else this morning. React.",
        intended_emotion="Sadness",
        instruction="React to the news.",
    ),
    Scenario(
        id="SAD_05",
        text="You just learned that a teacher who made a huge positive impact on your life during school has passed away. Tell a classmate the news.",
        intended_emotion="Sadness",
        instruction="Share the news with your classmate.",
    ),
    Scenario(
        id="SAD_06",
        text="You're packing up your childhood room because your family is selling the house you grew up in. Describe what you're feeling.",
        intended_emotion="Sadness",
        instruction="Express your feelings about leaving.",
    ),
    Scenario(
        id="SAD_07",
        text="Your long-distance partner just told you they think the distance is too hard and they want to take a break. Respond to them.",
        intended_emotion="Sadness",
        instruction="Respond to what they said.",
    ),

    # ── NEUTRAL ──
    Scenario(
        id="NEU_01",
        text="You need to call the electricity office to report your meter reading. Say: 'My consumer number is 4-4-7-2-9-0 and the current reading is 2-8-5-1 units.'",
        intended_emotion="Neutral",
        instruction="Read the information clearly and naturally.",
    ),
    Scenario(
        id="NEU_02",
        text="A friend asks you for directions from the main gate to the library. Give them step-by-step walking directions.",
        intended_emotion="Neutral",
        instruction="Give clear, calm directions.",
    ),
    Scenario(
        id="NEU_03",
        text="You're leaving a voicemail for a doctor's office to confirm your appointment. Say the date, time, and your name.",
        intended_emotion="Neutral",
        instruction="Leave a standard voicemail.",
    ),
    Scenario(
        id="NEU_04",
        text="Someone asks you to describe your daily morning routine. Walk them through what you typically do from waking up to leaving the house.",
        intended_emotion="Neutral",
        instruction="Describe your routine matter-of-factly.",
    ),
    Scenario(
        id="NEU_05",
        text="You're helping someone set up their new phone. Explain to them how to connect to Wi-Fi, step by step.",
        intended_emotion="Neutral",
        instruction="Give clear, patient instructions.",
    ),
    Scenario(
        id="NEU_06",
        text="A colleague asks what the weather is like today. Look outside and describe what you see — sky, temperature, wind.",
        intended_emotion="Neutral",
        instruction="Describe the weather objectively.",
    ),
    Scenario(
        id="NEU_07",
        text="You're ordering food over the phone. Tell the restaurant: 'I'd like one margherita pizza, a garden salad, and two bottles of water for delivery to 14 Park Street.'",
        intended_emotion="Neutral",
        instruction="Place the order naturally.",
    ),
]


def get_session_queue(
    scenarios_per_emotion: int = SCENARIOS_PER_EMOTION,
    exclude_ids: set[str] | None = None,
) -> list[Scenario]:
    """
    Build a balanced, shuffled prompt queue for one session.

    Selects `scenarios_per_emotion` scenarios for each of the 6 emotions,
    optionally avoiding scenario IDs that have already been used recently.
    """
    exclude_ids = exclude_ids or set()
    queue: list[Scenario] = []

    for emotion in EMOTIONS:
        pool = [
            s for s in SCENARIO_BANK
            if s.intended_emotion == emotion and s.id not in exclude_ids
        ]
        # If we've excluded too many, fall back to full pool for this emotion
        if len(pool) < scenarios_per_emotion:
            pool = [s for s in SCENARIO_BANK if s.intended_emotion == emotion]

        selected = random.sample(pool, min(scenarios_per_emotion, len(pool)))
        queue.extend(selected)

    random.shuffle(queue)
    return queue
