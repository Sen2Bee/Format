db_user="tom"  # Your MySQL username
db_passwd="user"  # Your MySQL password
db_name ="formatdb"  # Your MySQL database name

movies_path = r"e:\Format_FV\_Movies\_Movies_Fertig"

themes = [
    # Genre-based themes
  {'name': 'Actionfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Action'", 'css_class': 'theme-action'},
{'name': 'Komödien', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Comedy'", 'css_class': 'theme-comedy'},
{'name': 'Dramen', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Drama'", 'css_class': 'theme-drama'},
{'name': 'Sci-Fi-Filme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Sci-Fi'", 'css_class': 'theme-sci-fi'},
{'name': 'Liebesfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Romance'", 'css_class': 'theme-romance'},
{'name': 'Horrorfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Horror'", 'css_class': 'theme-horror'},
{'name': 'Thriller', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Thriller'", 'css_class': 'theme-thriller'},
{'name': 'Animationsfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Animation'", 'css_class': 'theme-animated'},
{'name': 'Familienfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Family'", 'css_class': 'theme-family'},
{'name': 'Abenteuerfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Adventure'", 'css_class': 'theme-adventure'},
{'name': 'Krimis', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Crime'", 'css_class': 'theme-crime'},
{'name': 'Fantasyfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Fantasy'", 'css_class': 'theme-fantasy'},
{'name': 'Mysteryfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Mystery'", 'css_class': 'theme-mystery'},
{'name': 'Dokumentationen', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Documentary'", 'css_class': 'theme-documentary'},
{'name': 'Biografien', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Biography'", 'css_class': 'theme-biography'},
{'name': 'Kriegsfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'War'", 'css_class': 'theme-war'},
{'name': 'Westernfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Western'", 'css_class': 'theme-western'},
{'name': 'Musikfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Musical'", 'css_class': 'theme-musical'},
{'name': 'Sportfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Sport'", 'css_class': 'theme-sport'},
{'name': 'Historienfilme', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'History'", 'css_class': 'theme-history'},
{'name': 'Französische Filme der 50er', 'sql_condition': "JOIN countries g ON m.movie_id = g.movie_id WHERE g.country = 'France' and m.release_date BETWEEN 1950 AND 1959", 'css_class': 'theme-history'},
# Jahrzehnt-basierte Themen
{'name': 'Filme der 1950er', 'sql_condition': "WHERE m.release_date BETWEEN 1950 AND 1959", 'css_class': 'theme-1950s'},
{'name': 'Filme der 1960er', 'sql_condition': "WHERE m.release_date BETWEEN 1960 AND 1969", 'css_class': 'theme-1960s'},
{'name': 'Filme der 1970er', 'sql_condition': "WHERE m.release_date BETWEEN 1970 AND 1979", 'css_class': 'theme-1970s'},
{'name': 'Filme der 1980er', 'sql_condition': "WHERE m.release_date BETWEEN 1980 AND 1989", 'css_class': 'theme-1980s'},
{'name': 'Filme der 1990er', 'sql_condition': "WHERE m.release_date BETWEEN 1990 AND 1999", 'css_class': 'theme-1990s'},
{'name': 'Filme der 2000er', 'sql_condition': "WHERE m.release_date BETWEEN 2000 AND 2009", 'css_class': 'theme-2000s'},
{'name': 'Filme der 2010er', 'sql_condition': "WHERE m.release_date BETWEEN 2010 AND 2019", 'css_class': 'theme-2010s'},
# Regisseur-basierte Themen
{'name': 'Steven Spielberg', 'sql_condition': "JOIN crew cr ON m.movie_id = cr.movie_id WHERE cr.name = 'Steven Spielberg' AND cr.job = 'Director'", 'css_class': 'theme-spielberg'},
{'name': 'Martin Scorsese', 'sql_condition': "JOIN crew cr ON m.movie_id = cr.movie_id WHERE cr.name = 'Martin Scorsese' AND cr.job = 'Director'", 'css_class': 'theme-scorsese'},
{'name': 'Quentin Tarantino', 'sql_condition': "JOIN crew cr ON m.movie_id = cr.movie_id WHERE cr.name = 'Quentin Tarantino' AND cr.job = 'Director'", 'css_class': 'theme-tarantino'},
{'name': 'Alfred Hitchcock', 'sql_condition': "JOIN crew cr ON m.movie_id = cr.movie_id WHERE cr.name = 'Alfred Hitchcock' AND cr.job = 'Director'", 'css_class': 'theme-hitchcock'},
{'name': 'Christopher Nolan', 'sql_condition': "JOIN crew cr ON m.movie_id = cr.movie_id WHERE cr.name = 'Christopher Nolan' AND cr.job = 'Director'", 'css_class': 'theme-nolan'},
# Preis-basierte Themen
{'name': 'Oscar-Gewinner', 'sql_condition': "WHERE m.wiki_awards LIKE '%Oscar%'", 'css_class': 'theme-oscar'},
{'name': 'Kritikerlieblinge', 'sql_condition': "WHERE m.imdb_rating > 8", 'css_class': 'theme-acclaimed'},
{'name': 'Top-Filme', 'sql_condition': "WHERE m.imdb_rating > 8.5", 'css_class': 'theme-top-rated'},
# Gemischte Themen
{'name': 'Romantische Komödien', 'sql_condition': "JOIN genres g1 ON m.movie_id = g1.movie_id JOIN genres g2 ON m.movie_id = g2.movie_id WHERE g1.genre = 'Romance' AND g2.genre = 'Comedy'", 'css_class': 'theme-rom-com'},
{'name': 'Sci-Fi-Klassiker', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Sci-Fi' AND m.release_date < 1980", 'css_class': 'theme-sci-fi-classic'},

]


# Search in title, original_title, and other specified fields
search_conditions = ("""
    (m.title LIKE %s 
    OR m.original_title LIKE %s 
    OR m.format_titel LIKE %s 
    OR m.format_orig_titel LIKE %s 
    OR m.wiki_awards LIKE %s
    OR EXISTS (
        SELECT 1 FROM cast c WHERE c.movie_id = m.movie_id AND c.name LIKE %s
    )
    OR EXISTS (
        SELECT 1 FROM crew cr WHERE cr.movie_id = m.movie_id AND cr.job = 'director' AND cr.name LIKE %s
    ))
""")