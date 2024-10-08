db_user="tom"  # Your MySQL username
db_passwd="user"  # Your MySQL password
db_name ="formatdb"  # Your MySQL database name

themes = [
    # Genre-based themes
    {'name': 'Action Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Action'", 'css_class': 'theme-action'},
    {'name': 'Comedy Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Comedy'", 'css_class': 'theme-comedy'},
    {'name': 'Drama Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Drama'", 'css_class': 'theme-drama'},
    {'name': 'Sci-Fi Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Sci-Fi'", 'css_class': 'theme-sci-fi'},
    {'name': 'Romantic Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Romance'", 'css_class': 'theme-romance'},
    {'name': 'Horror Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Horror'", 'css_class': 'theme-horror'},
    {'name': 'Thriller Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Thriller'", 'css_class': 'theme-thriller'},
    {'name': 'Animated Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Animation'", 'css_class': 'theme-animated'},
    {'name': 'Family Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Family'", 'css_class': 'theme-family'},
    {'name': 'Adventure Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Adventure'", 'css_class': 'theme-adventure'},
    {'name': 'Crime Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Crime'", 'css_class': 'theme-crime'},
    {'name': 'Fantasy Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Fantasy'", 'css_class': 'theme-fantasy'},
    {'name': 'Mystery Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Mystery'", 'css_class': 'theme-mystery'},
    {'name': 'Documentary Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Documentary'", 'css_class': 'theme-documentary'},
    {'name': 'Biographical Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Biography'", 'css_class': 'theme-biography'},
    {'name': 'War Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'War'", 'css_class': 'theme-war'},
    {'name': 'Western Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Western'", 'css_class': 'theme-western'},
    {'name': 'Musical Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Musical'", 'css_class': 'theme-musical'},
    {'name': 'Sport Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Sport'", 'css_class': 'theme-sport'},
    {'name': 'History Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'History'", 'css_class': 'theme-history'},
    {'name': 'French Movies from the 70ties', 'sql_condition': "JOIN countries g ON m.movie_id = g.movie_id WHERE g.country = 'France' and m.release_date BETWEEN 1950 AND 1959", 'css_class': 'theme-history'},    
    # Decade-based themes
    {'name': 'Movies from the 1950s', 'sql_condition': "WHERE m.release_date BETWEEN 1950 AND 1959", 'css_class': 'theme-1950s'},
    {'name': 'Movies from the 1960s', 'sql_condition': "WHERE m.release_date BETWEEN 1960 AND 1969", 'css_class': 'theme-1960s'},
    {'name': 'Movies from the 1970s', 'sql_condition': "WHERE m.release_date BETWEEN 1970 AND 1979", 'css_class': 'theme-1970s'},
    {'name': 'Movies from the 1980s', 'sql_condition': "WHERE m.release_date BETWEEN 1980 AND 1989", 'css_class': 'theme-1980s'},
    {'name': 'Movies from the 1990s', 'sql_condition': "WHERE m.release_date BETWEEN 1990 AND 1999", 'css_class': 'theme-1990s'},
    {'name': 'Movies from the 2000s', 'sql_condition': "WHERE m.release_date BETWEEN 2000 AND 2009", 'css_class': 'theme-2000s'},
    {'name': 'Movies from the 2010s', 'sql_condition': "WHERE m.release_date BETWEEN 2010 AND 2019", 'css_class': 'theme-2010s'},
    # Director-based themes
    {'name': 'Movies by Steven Spielberg', 'sql_condition': "JOIN crew cr ON m.movie_id = cr.movie_id WHERE cr.name = 'Steven Spielberg' AND cr.job = 'Director'", 'css_class': 'theme-spielberg'},
    {'name': 'Movies by Martin Scorsese', 'sql_condition': "JOIN crew cr ON m.movie_id = cr.movie_id WHERE cr.name = 'Martin Scorsese' AND cr.job = 'Director'", 'css_class': 'theme-scorsese'},
    {'name': 'Movies by Quentin Tarantino', 'sql_condition': "JOIN crew cr ON m.movie_id = cr.movie_id WHERE cr.name = 'Quentin Tarantino' AND cr.job = 'Director'", 'css_class': 'theme-tarantino'},
    {'name': 'Movies by Alfred Hitchcock', 'sql_condition': "JOIN crew cr ON m.movie_id = cr.movie_id WHERE cr.name = 'Alfred Hitchcock' AND cr.job = 'Director'", 'css_class': 'theme-hitchcock'},
    {'name': 'Movies by Christopher Nolan', 'sql_condition': "JOIN crew cr ON m.movie_id = cr.movie_id WHERE cr.name = 'Christopher Nolan' AND cr.job = 'Director'", 'css_class': 'theme-nolan'},
    # Award-based themes
    {'name': 'Oscar-Winning Movies', 'sql_condition': "WHERE m.wiki_awards LIKE '%Oscar%'", 'css_class': 'theme-oscar'},
    {'name': 'Critically Acclaimed Movies', 'sql_condition': "WHERE m.imdb_rating > 8", 'css_class': 'theme-acclaimed'},
    {'name': 'Top Rated Movies', 'sql_condition': "WHERE m.imdb_rating > 8.5", 'css_class': 'theme-top-rated'},
    # Mixed themes
    {'name': 'Romantic Comedies', 'sql_condition': "JOIN genres g1 ON m.movie_id = g1.movie_id JOIN genres g2 ON m.movie_id = g2.movie_id WHERE g1.genre = 'Romance' AND g2.genre = 'Comedy'", 'css_class': 'theme-rom-com'},
    {'name': 'Science Fiction Classics', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Sci-Fi' AND m.release_date < 1980", 'css_class': 'theme-sci-fi-classic'},
    # {'name': 'Animated Disney Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Animation' AND m.production_company LIKE '%Disney%'", 'css_class': 'theme-disney'},
    # {'name': 'Pixar Animation Movies', 'sql_condition': "JOIN genres g ON m.movie_id = g.movie_id WHERE g.genre = 'Animation' AND m.production_company LIKE '%Pixar%'", 'css_class': 'theme-pixar'},
]
