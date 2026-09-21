echo "== bench version"; 
bench version 2>&1 | tail -15; 
echo; echo "== doctor (workers / scheduler)"; 
bench doctor 2>&1 | tail -15; echo; 
echo "== site status"; 
bench --site micromaxerp doctor 2>&1 | tail -8; 
echo; echo "== listening ports"; 
(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null) | grep -E ":(8000|9000|11000|13000|5173|3306)\b" | awk '{print $4, $6}' | sed 's/users:((//; s/))//' | head