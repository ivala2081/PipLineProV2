"""
Safe logging utility to handle Unicode characters on Windows
"""
import logging
import sys
import os
from typing import Any

class SafeFormatter(logging.Formatter):
    """Custom formatter that handles Unicode characters safely"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with safe Unicode handling"""
        try:
            # Get the formatted message
            message = super().format(record)
            
            # Check if we're on Windows and console encoding might be an issue
            if sys.platform == 'win32' and hasattr(sys.stdout, 'encoding'):
                # Try to encode the message to check for issues
                try:
                    message.encode(sys.stdout.encoding or 'utf-8')
                    return message
                except UnicodeEncodeError:
                    # Replace problematic characters with safe alternatives
                    safe_message = self._make_safe(message)
                    return safe_message
            
            return message
            
        except Exception:
            # Fallback to basic formatting if anything goes wrong
            return f"{record.levelname}: {record.getMessage()}"

    def _make_safe(self, text: str) -> str:
        """Replace Unicode characters with safe alternatives"""
        replacements = {
            '✅': '[OK]',
            '⚠️': '[WARN]',
            '🔄': '[PROC]',
            '📤': '[OUT]',
            '📥': '[IN]',
            '🚀': '[START]',
            '⏹️': '[STOP]',
            '🔧': '[CONFIG]',
            '📱': '[APP]',
            '🌐': '[WEB]',
            '💾': '[SAVE]',
            '🗑️': '[DELETE]',
            '📊': '[STATS]',
            '🔍': '[SEARCH]',
            '⚡': '[FAST]',
            '🛡️': '[SECURE]',
            '🔐': '[AUTH]',
            '📈': '[UP]',
            '📉': '[DOWN]',
            '🎯': '[TARGET]',
            '🏆': '[SUCCESS]',
            '❌': '[ERROR]',
            '⏰': '[TIME]',
            '📍': '[LOC]',
            '🔗': '[LINK]',
            '📋': '[CLIP]',
            '🎨': '[STYLE]',
            '🔧': '[TOOL]',
            '📦': '[PACK]',
            '🏠': '[HOME]',
            '👤': '[USER]',
            '🔑': '[KEY]',
            '💡': '[IDEA]',
            '🎉': '[CELEB]',
            '🔥': '[HOT]',
            '❄️': '[COLD]',
            '⭐': '[STAR]',
            '💎': '[GEM]',
            '🎪': '[CIRCUS]',
            '🎭': '[MASK]',
            '🎨': '[ART]',
            '🎵': '[MUSIC]',
            '🎬': '[MOVIE]',
            '🎮': '[GAME]',
            '🏅': '[MEDAL]',
            '🏆': '[TROPHY]',
            '🎯': '[BULLSEYE]',
            '🎲': '[DICE]',
            '🎳': '[BOWL]',
            '🎸': '[GUITAR]',
            '🎺': '[TRUMPET]',
            '🎻': '[VIOLIN]',
            '🥁': '[DRUM]',
            '🎤': '[MIC]',
            '🎧': '[HEADPHONE]',
            '📻': '[RADIO]',
            '📺': '[TV]',
            '📷': '[CAMERA]',
            '📹': '[VIDEO]',
            '💻': '[LAPTOP]',
            '🖥️': '[DESKTOP]',
            '⌨️': '[KEYBOARD]',
            '🖱️': '[MOUSE]',
            '💾': '[DISK]',
            '💿': '[CD]',
            '📀': '[DVD]',
            '💽': '[MINIDISC]',
            '💾': '[FLOPPY]',
            '📱': '[PHONE]',
            '☎️': '[TELEPHONE]',
            '📞': '[RECEIVER]',
            '📠': '[FAX]',
            '🔌': '[PLUG]',
            '🔋': '[BATTERY]',
            '🔍': '[MAGNIFY]',
            '🔎': '[MAGNIFY_R]',
            '🕯️': '[CANDLE]',
            '💡': '[BULB]',
            '🔦': '[FLASHLIGHT]',
            '🏮': '[LANTERN]',
            '🪔': '[OIL_LAMP]',
            '📔': '[NOTEBOOK]',
            '📕': '[CLOSED_BOOK]',
            '📖': '[OPEN_BOOK]',
            '📗': '[GREEN_BOOK]',
            '📘': '[BLUE_BOOK]',
            '📙': '[ORANGE_BOOK]',
            '📚': '[BOOKS]',
            '📓': '[NOTEBOOK]',
            '📒': '[LEDGER]',
            '📃': '[PAGE]',
            '📄': '[DOCUMENT]',
            '📜': '[SCROLL]',
            '📰': '[NEWSPAPER]',
            '🗞️': '[NEWSPAPER_ROLL]',
            '📑': '[BOOKMARK]',
            '🔖': '[BOOKMARK_TAB]',
            '🏷️': '[LABEL]',
            '💰': '[MONEY_BAG]',
            '💴': '[YEN]',
            '💵': '[DOLLAR]',
            '💶': '[EURO]',
            '💷': '[POUND]',
            '💸': '[MONEY_WINGS]',
            '💳': '[CREDIT_CARD]',
            '🧾': '[RECEIPT]',
            '💎': '[GEM]',
            '⚖️': '[SCALES]',
            '🔧': '[WRENCH]',
            '🔨': '[HAMMER]',
            '⚒️': '[HAMMER_PICK]',
            '🛠️': '[TOOLS]',
            '⚙️': '[GEAR]',
            '🔩': '[BOLT]',
            '⚗️': '[ALEMBIC]',
            '🧪': '[TEST_TUBE]',
            '🧫': '[PETRI_DISH]',
            '🧬': '[DNA]',
            '🔬': '[MICROSCOPE]',
            '🔭': '[TELESCOPE]',
            '📡': '[SATELLITE]',
            '💉': '[SYRINGE]',
            '💊': '[PILL]',
            '🩹': '[BANDAGE]',
            '🩺': '[STETHOSCOPE]',
            '🚪': '[DOOR]',
            '🛏️': '[BED]',
            '🛋️': '[COUCH]',
            '🚽': '[TOILET]',
            '🚿': '[SHOWER]',
            '🛁': '[BATHTUB]',
            '🛀': '[BATH]',
            '🧴': '[BOTTLE]',
            '🧷': '[SAFETY_PIN]',
            '🧹': '[BROOM]',
            '🧺': '[BASKET]',
            '🧻': '[ROLL]',
            '🚰': '[FOUNTAIN]',
            '🚰': '[TAP]',
            '🧼': '[SOAP]',
            '🧽': '[SPONGE]',
            '🧯': '[FIRE_EXTINGUISHER]',
            '🛒': '[SHOPPING_CART]',
            '🚬': '[CIGARETTE]',
            '⚰️': '[COFFIN]',
            '⚱️': '[URN]',
            '🗿': '[MOAI]',
            '🏧': '[ATM]',
            '🚮': '[LITTER]',
            '🚰': '[WATER]',
            '♿': '[WHEELCHAIR]',
            '🚹': '[MENS]',
            '🚺': '[WOMENS]',
            '🚻': '[RESTROOM]',
            '🚼': '[BABY]',
            '🚾': '[WC]',
            '🛂': '[PASSPORT]',
            '🛃': '[CUSTOMS]',
            '🛄': '[BAGGAGE]',
            '🛅': '[LEFT_LUGGAGE]',
            '⚠️': '[WARNING]',
            '🚸': '[CHILDREN]',
            '⛔': '[NO_ENTRY]',
            '🚫': '[PROHIBITED]',
            '🚳': '[NO_BIKES]',
            '🚭': '[NO_SMOKING]',
            '🚯': '[NO_LITTERING]',
            '🚱': '[NO_WATER]',
            '🚷': '[NO_PEDESTRIANS]',
            '📵': '[NO_PHONES]',
            '🔞': '[NO_UNDER_18]',
            '☢️': '[RADIOACTIVE]',
            '☣️': '[BIOHAZARD]',
            '⬆️': '[UP_ARROW]',
            '↗️': '[UP_RIGHT]',
            '➡️': '[RIGHT_ARROW]',
            '↘️': '[DOWN_RIGHT]',
            '⬇️': '[DOWN_ARROW]',
            '↙️': '[DOWN_LEFT]',
            '⬅️': '[LEFT_ARROW]',
            '↖️': '[UP_LEFT]',
            '↕️': '[UP_DOWN]',
            '↔️': '[LEFT_RIGHT]',
            '↩️': '[RETURN_LEFT]',
            '↪️': '[RETURN_RIGHT]',
            '⤴️': '[CURVE_UP]',
            '⤵️': '[CURVE_DOWN]',
            '🔃': '[REFRESH]',
            '🔄': '[REPEAT]',
            '🔙': '[BACK]',
            '🔚': '[END]',
            '🔛': '[ON]',
            '🔜': '[SOON]',
            '🔝': '[TOP]',
        }
        
        for emoji, replacement in replacements.items():
            text = text.replace(emoji, replacement)
        
        return text

def setup_safe_logging():
    """Setup safe logging configuration"""
    # Get the root logger
    root_logger = logging.getLogger()
    
    # Update all existing handlers with safe formatter
    for handler in root_logger.handlers:
        if isinstance(handler, logging.StreamHandler):
            # Create safe formatter
            safe_formatter = SafeFormatter(
                fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            handler.setFormatter(safe_formatter)

def safe_log(logger: logging.Logger, level: int, message: str, *args, **kwargs):
    """Safely log a message with Unicode handling"""
    try:
        # Check if we're on Windows and console encoding might be an issue
        if sys.platform == 'win32' and hasattr(sys.stdout, 'encoding'):
            # Try to encode the message to check for issues
            try:
                message.encode(sys.stdout.encoding or 'utf-8')
                logger.log(level, message, *args, **kwargs)
            except UnicodeEncodeError:
                # Replace problematic characters with safe alternatives
                safe_message = SafeFormatter()._make_safe(message)
                logger.log(level, safe_message, *args, **kwargs)
        else:
            logger.log(level, message, *args, **kwargs)
    except Exception:
        # Fallback to basic logging if anything goes wrong
        logger.log(level, f"Log message with encoding issues: {str(message)[:100]}...", *args, **kwargs)
