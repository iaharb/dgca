filepath = r'c:\projects\dgca\src\App.tsx'
with open(filepath, encoding='utf-8') as f:
    content = f.read()

insertion_line = "                {activeTab === 'manual' && <UserManual userType={profile?.role} />}\n"

# Find the exact marker from the repr output
marker = "AODBControlCenter />}\n             </motion.div>"

if "UserManual" in content and "activeTab === 'manual'" in content:
    print("Already inserted.")
elif marker in content:
    content = content.replace(marker, f"AODBControlCenter />}}\n{insertion_line}             </motion.div>")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done.")
else:
    print("Marker not found. Dumping area...")
    idx = content.rfind('AODBControlCenter')
    print(repr(content[idx:idx+150]))
