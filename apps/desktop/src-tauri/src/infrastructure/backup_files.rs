use std::fs;
use std::path::{Path, PathBuf};

use crate::domain::ports::{BackupFiles, RepositoryError};

/// Plain JSON files in one directory. Names are checked so a caller can never leave it.
pub struct DirectoryBackupFiles {
    dir: PathBuf,
}

impl DirectoryBackupFiles {
    pub fn new(dir: PathBuf) -> Self {
        Self { dir }
    }

    pub fn path_of(&self, name: &str) -> Result<PathBuf, RepositoryError> {
        if !is_safe_name(name) {
            return Err(RepositoryError::InvalidData(format!(
                "bad file name {name}"
            )));
        }
        Ok(self.dir.join(name))
    }
}

/// Letters, digits, `-`, `_` and a single `.json` ending. No separators, no `..`.
pub fn is_safe_name(name: &str) -> bool {
    let Some(stem) = name.strip_suffix(".json") else {
        return false;
    };
    !stem.is_empty()
        && stem
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

impl BackupFiles for DirectoryBackupFiles {
    fn write(&self, name: &str, content: &str) -> Result<(), RepositoryError> {
        let path = self.path_of(name)?;
        fs::create_dir_all(&self.dir).map_err(io)?;
        // Write beside the target and rename, so a crash never leaves half a backup.
        let temporary = self.dir.join(format!("{name}.tmp"));
        fs::write(&temporary, content).map_err(io)?;
        fs::rename(&temporary, &path).map_err(io)
    }

    fn read(&self, name: &str) -> Result<String, RepositoryError> {
        fs::read_to_string(self.path_of(name)?).map_err(io)
    }

    fn exists(&self, name: &str) -> Result<bool, RepositoryError> {
        Ok(self.path_of(name)?.is_file())
    }

    fn list(&self) -> Result<Vec<String>, RepositoryError> {
        if !Path::new(&self.dir).is_dir() {
            return Ok(Vec::new());
        }
        let mut names: Vec<String> = fs::read_dir(&self.dir)
            .map_err(io)?
            .filter_map(Result::ok)
            .filter_map(|entry| entry.file_name().into_string().ok())
            .filter(|name| is_safe_name(name))
            .collect();
        names.sort();
        Ok(names)
    }

    fn delete(&self, name: &str) -> Result<(), RepositoryError> {
        match fs::remove_file(self.path_of(name)?) {
            Err(error) if error.kind() != std::io::ErrorKind::NotFound => Err(io(error)),
            _ => Ok(()),
        }
    }

    fn location(&self, name: &str) -> Result<String, RepositoryError> {
        Ok(self.path_of(name)?.display().to_string())
    }
}

fn io(error: std::io::Error) -> RepositoryError {
    RepositoryError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_plain_json_names_are_accepted() {
        assert!(is_safe_name("backup-2026-10-15.json"));
        assert!(is_safe_name("pre-import-20261015_083000.json"));
        for bad in [
            "../x.json",
            "a/b.json",
            "a\\b.json",
            "x.txt",
            ".json",
            "x.json.tmp",
            "a b.json",
            "",
        ] {
            assert!(!is_safe_name(bad), "{bad}");
        }
    }

    #[test]
    fn write_read_list_and_delete_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let files = DirectoryBackupFiles::new(dir.path().join("backups"));
        assert!(files.list().unwrap().is_empty());

        files.write("b.json", "{\"b\":1}").unwrap();
        files.write("a.json", "{\"a\":1}").unwrap();
        assert_eq!(files.list().unwrap(), vec!["a.json", "b.json"]);
        assert_eq!(files.read("a.json").unwrap(), "{\"a\":1}");
        assert!(files.exists("a.json").unwrap());

        files.delete("a.json").unwrap();
        files.delete("a.json").unwrap();
        assert!(!files.exists("a.json").unwrap());
        assert_eq!(files.list().unwrap(), vec!["b.json"]);
    }

    #[test]
    fn writing_replaces_a_file_and_leaves_no_temporary_one() {
        let dir = tempfile::tempdir().unwrap();
        let files = DirectoryBackupFiles::new(dir.path().to_path_buf());
        files.write("a.json", "one").unwrap();
        files.write("a.json", "two").unwrap();
        assert_eq!(files.read("a.json").unwrap(), "two");
        assert_eq!(files.list().unwrap(), vec!["a.json"]);
        assert!(!dir.path().join("a.json.tmp").exists());
    }

    #[test]
    fn a_name_that_escapes_the_directory_is_refused() {
        let dir = tempfile::tempdir().unwrap();
        let files = DirectoryBackupFiles::new(dir.path().join("inner"));
        assert!(matches!(
            files.write("../escape.json", "x"),
            Err(RepositoryError::InvalidData(_))
        ));
        assert!(!dir.path().join("escape.json").exists());
    }
}
