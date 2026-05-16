"""Character prompt templates for portrait generation.

Each character has a fixed physical description ("template") that the prompt
enforces. Same template + same seed = same face across appearances. The
templates are tuned for South Indian / Bangalorean appearance and the
visual style of the existing scene catalog.

A separate seed per character locks the face independent of generation order.
"""

# (character_id, name, seed, template)
# Template should describe ONLY physical and clothing attributes — the
# style suffix from generate_scenes_local.py adds the painterly/comic look.
CHARACTERS = [
    (
        "ravi_auto",
        "Ravi",
        101,
        "portrait of 40-year-old wiry South Indian auto rickshaw driver, "
        "weathered tanned face, thin black moustache, dark eyes, blue checked"
        " shirt with collar, slim build, sharp jawline, tired alertness, "
        "looking slightly off-camera, night",
    ),
    (
        "chai_anna",
        "Anna",
        102,
        "portrait of 45-year-old South Indian chai stall owner, friendly "
        "round face, salt-and-pepper short hair, kind eyes with crow's feet,"
        " plain white half-sleeve shirt, brass kettle visible behind shoulder,"
        " warm smile, morning light",
    ),
    (
        "hotel_clerk",
        "Receptionist",
        103,
        "portrait of 35-year-old Indian woman hotel receptionist, "
        "professional, hair tied back in a low bun, plain navy blouse, "
        "polite tired smile, dimly lit hotel lobby, evening",
    ),
    (
        "rangaswamy",
        "Rangaswamy",
        104,
        "portrait of 28-year-old young Indian real-estate broker, "
        "fast-talking energy, slim build, Bluetooth headset over one ear, "
        "blue polo shirt, smartphone in hand, mid-action expression, "
        "Bangalore street background blurred",
    ),
    (
        "mysuru_uncle",
        "Krishnamurthy uncle",
        105,
        "portrait of 65-year-old kind Mysuru South Indian uncle, silver "
        "well-combed hair, gold-rimmed spectacles, soft eyes, plain white "
        "cotton shirt, light skin tone, gentle inquisitive expression, "
        "old house verandah background, morning light",
    ),
    (
        "lokesh",
        "Lokesh",
        106,
        "portrait of 55-year-old North Karnataka apartment watchman, "
        "weathered face, thick black moustache, pencil tucked behind ear, "
        "khaki security uniform shirt, broad shoulders, friendly observant "
        "expression, compound gate background, daylight",
    ),
    (
        "vendor_aunty",
        "Vendor aunty",
        107,
        "portrait of 50-year-old Bangalore vegetable vendor aunty, "
        "kind broad face, large red bindi, hair tied up, bright orange and "
        "green Indian sari with patterned border, gold jhumkas earrings, "
        "weighing vegetables on brass scale, Sunday market background",
    ),
    (
        "neighbour",
        "Padma",
        108,
        "portrait of 38-year-old working Indian mother, salwar kameez in "
        "soft blue print, hair in a neat bun, small bindi, gentle but tired"
        " smile, holding a steel tiffin box, apartment doorway background,"
        " evening light",
    ),
    (
        "karthik",
        "Karthik",
        109,
        "portrait of 28-year-old casual Bangalore software engineer, short "
        "dark hair, black rectangular glasses, three-day stubble, beige "
        "casual collared shirt, friendly easy smile, holding a beer glass, "
        "rooftop pub string-light background",
    ),
    (
        "anika",
        "Anika",
        110,
        "portrait of 27-year-old young Bangalorean Kannadiga woman, "
        "shoulder-length straight black hair, expressive dark eyes, small "
        "nose ring, modern fitted printed kurti in deep teal, light tan "
        "skin, intelligent amused expression, bookstore aisle background, "
        "warm afternoon light",
    ),
    (
        "cook_aunty",
        "Saraswati",
        111,
        "portrait of 45-year-old professional Indian cook aunty, maroon "
        "cotton sari with thin gold border, hair in a tight bun, small "
        "bindi, brisk capable expression, holding a stainless steel ladle,"
        " home kitchen background, morning light",
    ),
    (
        "pharmacist",
        "Pharmacist",
        112,
        "portrait of 32-year-old male Indian pharmacist, short dark hair, "
        "wire-frame glasses, light blue Apollo pharmacy collared uniform "
        "shirt with logo patch, helpful attentive expression, behind the "
        "glass counter, pharmacy interior background, fluorescent lighting",
    ),
    (
        "appa",
        "Appa",
        113,
        "portrait of 65-year-old quiet South Indian father, neatly combed "
        "silver hair, thin silver-rimmed glasses, plain ivory cotton "
        "shirt, calm thoughtful expression, holding a folded newspaper, "
        "indoor living room background, afternoon side-light",
    ),
    (
        "amma",
        "Amma",
        114,
        "portrait of 58-year-old warm South Indian mother, silver hair in "
        "low neat bun, kind crinkled eyes, small red bindi, soft green "
        "cotton sari with cream border, gold thin chain, gentle "
        "observant smile, home kitchen doorway background, warm afternoon"
        " light",
    ),
    (
        "temple_auntie",
        "Temple auntie",
        115,
        "portrait of 60-year-old bustling South Indian temple auntie, "
        "silver-streaked hair in a bun with jasmine flowers, large red "
        "bindi, bright pink and orange floral sari, gold chain and bangles,"
        " smartphone in hand mid-talk, warm presumptuous smile, temple "
        "queue background, dawn light",
    ),
    (
        "anika_friend",
        "Divya",
        116,
        "portrait of 28-year-old confident young Bangalore woman, jet-black"
        " hair tied in a high ponytail, sharp dark eyes, small silver hoop"
        " earrings, modern olive shirt, slight amused smirk, holding a beer"
        " glass, pub interior string-light background, evening",
    ),
    (
        "mom",
        "Amma (mum)",
        117,
        "portrait of 55-year-old gentle Indian mother holding a smartphone "
        "to her ear, silver hair in a soft braid, small bindi, soft "
        "purple sari, warm tired loving expression, home living room "
        "background, evening lamplight",
    ),
]


def get_character(character_id: str):
    for c in CHARACTERS:
        if c[0] == character_id:
            return c
    return None
