"""Tokenisation + query expansion shared by ingestion and retrieval.

Normalisation makes spelling variants match: e-Shram / eshram / e shram /
ई-श्रम / ईश्रम all become `eshram`; aadhar/adhar -> aadhaar; Devanagari
nukta and chandrabindu variants are folded.
"""
import re
import unicodedata

_ZW = re.compile("[\u200b\u200c\u200d\ufeff]")
_ESHRAM = re.compile(r"\b(?:e|ई|इ)[\s\-_.]*(?:shram|sram|श्रम)\b|\beshram\w*|ई[\s\-]*श्रम|ईश्रम", re.I)
_AADHAAR = re.compile(r"\b(?:aadhaar|aadhar|adhar|adhaar|aadhar)\b|आधार", re.I)
_DEV = re.compile(r"[\u0900-\u097F]")
_INDIC = re.compile(r"[\u0900-\u0DFF]")
_TOKEN = re.compile(r"[a-z0-9]+|[\u0900-\u097F]+")


def has_devanagari(s: str) -> bool:
    return bool(_DEV.search(s or ""))


def has_non_latin_indic(s: str) -> bool:
    return bool(_INDIC.search(s or ""))


def normalize_text(s: str) -> str:
    s = _ZW.sub("", s or "")
    s = unicodedata.normalize("NFD", s)
    s = s.replace("\u093c", "")          # nukta: ज़ -> ज, फ़ -> फ
    s = unicodedata.normalize("NFC", s).replace("\u0901", "\u0902")  # chandrabindu -> anusvara
    s = s.lower()
    s = _ESHRAM.sub(" eshram ", s)
    s = _AADHAAR.sub(" aadhaar ", s)
    return s


_STOP_RAW = """the a an and or is are was were be to of in for on with how what when where who why can do
does did i my me you your it this that from about tell explain please get have has any if am will would
should could kya hai hain ka ki ke ko se mein main par aur ek ye yeh kaise kab kahan kaun kon kyun kyu
banaye banaen banwaye banwa karein kare karna kar hota hoti hote chahiye chahie sakta sakte sakti milta
milti milte mujhe mera meri mere hum aap apna apni liye lie wala wali toh to bhi nahi nahin kitna kitne
क्या है हैं का की के को में से पर और एक यह ये कैसे कब कहाँ कहां कौन क्यों कर करें करना करे सकता सकते
सकती होता होती होते चाहिए चाहिये मेरा मेरी मेरे मुझे हम आप अपना अपनी लिए वाला वाली तो भी नहीं कितना
कितने बनाये बनवाये बनवाएं"""


def _norm_set(words):
    return {normalize_text(w).strip() for w in words if w.strip()}


STOP = _norm_set(_STOP_RAW.split())


def tokens(s: str, drop_stop: bool = True):
    out = _TOKEN.findall(normalize_text(s))
    return [t for t in out if len(t) > 1 and not (drop_stop and t in STOP)]


# Hindi / Hinglish -> English retrieval terms (documents are mostly English).
_HI_EN_RAW = {
    "registration register enroll": "रजिस्ट्रेशन रजिस्टर रजिस्ट्रेशन पंजीकरण पंजीकृत पंजीयन panjikaran panjikran rajistration registration register रजिस्ट्रर नामांकन",
    "card": "कार्ड",
    "benefit benefits": "लाभ फायदा फायदे फ़ायदा labh fayda fayde benefit benefits सुविधा suvidha",
    "insurance accident": "बीमा bima beema insurance दुर्घटना durghatna",
    "pension": "पेंशन pension",
    "documents document": "दस्तावेज दस्तावेज़ कागज़ कागज कागजात dastavez dastaavej kagaz kagzat documents",
    "aadhaar": "आधार aadhaar aadhar adhar",
    "mobile": "मोबाइल mobile फोन फ़ोन phone",
    "bank account": "बैंक bank खाता khata",
    "eligibility eligible": "पात्र पात्रता patra patrata eligible eligibility योग्य",
    "apply application": "आवेदन apply arzi application अप्लाई",
    "unorganised unorganized": "असंगठित asangathit unorganised unorganized",
    "worker workers labour": "श्रमिक मजदूर मज़दूर कामगार mazdoor majdoor shramik kamgar worker workers",
    "age": "उम्र आयु umar aayu umra",
    "income": "आय आमदनी कमाई aay aamdani income",
    "income tax taxpayer": "टैक्स आयकर इनकम tax",
    "epfo": "ईपीएफओ epfo पीएफ pf",
    "esic": "ईएसआईसी esic",
    "uan": "यूएएन uan",
    "update correction": "अपडेट सुधार संशोधन update correction badlav",
    "helpline grievance complaint": "हेल्पलाइन शिकायत helpline shikayat complaint",
    "number": "नंबर number",
    "farmer": "किसान kisan",
    "street vendor": "रेहड़ी पटरी ठेला रेहड़ीवाले thela rehdi",
    "migrant": "प्रवासी pravasi migrant",
    "download": "डाउनलोड download",
    "otp": "ओटीपी otp",
    "csc common service centre": "सीएससी csc",
    "scheme": "योजना yojana scheme",
    "free": "निशुल्क मुफ्त मुफ़्त मुफ्त free muft nishulk",
    "status": "स्थिति status",
    "payment": "भुगतान bhugtan payment पैसा paisa",
    "domestic worker": "घरेलू gharelu",
    "construction": "निर्माण nirman construction",
    "disability": "विकलांगता दिव्यांग divyang disability",
}
HI_EN = {}
for _en, _keys in _HI_EN_RAW.items():
    for _k in _keys.split():
        HI_EN.setdefault(normalize_text(_k).strip(), set()).update(_en.split())

_TRAILING_SIGNS = re.compile("[\u093e-\u094c\u0902\u0903]+$")


def expand_tokens(toks):
    """English equivalents for Hindi/Hinglish tokens (dictionary based)."""
    extra = []
    for t in toks:
        hits = HI_EN.get(t) or HI_EN.get(_TRAILING_SIGNS.sub("", t))
        if hits:
            extra.extend(sorted(hits))
    return extra
