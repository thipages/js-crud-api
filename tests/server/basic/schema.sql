CREATE TABLE user (id INTEGER PRIMARY KEY AUTOINCREMENT,login TEXT,pass TEXT);
CREATE TABLE person (id INTEGER PRIMARY KEY AUTOINCREMENT,lastname TEXT,firstname TEXT,user_id INTEGER NOT NULL ,FOREIGN KEY(user_id) REFERENCES user(id));
CREATE INDEX person_user_id_idx ON person (user_id);
CREATE TABLE note (id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,note TEXT,user_id INTEGER NOT NULL ,FOREIGN KEY(user_id) REFERENCES user(id));
CREATE INDEX note_user_id_idx ON note (user_id);
CREATE TABLE sub_note (id INTEGER PRIMARY KEY AUTOINCREMENT,note_id INTEGER NOT NULL ,FOREIGN KEY(note_id) REFERENCES note(id));
CREATE INDEX sub_note_note_id_idx ON sub_note (note_id);
