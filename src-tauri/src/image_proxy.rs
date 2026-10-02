use percent_encoding::percent_decode_str;
use reqwest::Url;

// convertFileSrc places the encoded source URL in the path on every platform.
// Windows requests are normalized by Tauri before reaching this handler.
pub fn source_url(path: &str) -> Result<Url, String> {
    let source = percent_decode_str(path.trim_start_matches('/'))
        .decode_utf8()
        .map_err(|error| error.to_string())?;
    let url = Url::parse(&source).map_err(|error| error.to_string())?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err("Expected an HTTP or HTTPS image URL".into());
    }
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::source_url;
    use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};

    #[test]
    fn decodes_source_on_all_platforms_and_build_modes() {
        let sources = [
            "https://example.com/images/2026/08/episode-cover.jpg?version=1234567890",
            "http://example.com:8080/cover.jpg?name=a%20b&token=a%2Fb%2Bc#cover",
            "https://example.com/caf%C3%A9.jpg?q=%252F",
        ];
        for source in sources {
            let encoded = utf8_percent_encode(source, NON_ALPHANUMERIC).to_string();
            for prefix in [
                "https://imgproxy.localhost/",
                "http://imgproxy.localhost/",
                "imgproxy://localhost/",
            ] {
                let uri: tauri::http::Uri = format!("{prefix}{encoded}").parse().unwrap();
                assert_eq!(source_url(uri.path()).unwrap().as_str(), source);
            }
        }
    }

    #[test]
    fn rejects_invalid_and_non_http_sources() {
        for path in [
            "/",
            "/not-a-url",
            "/file%3A%2F%2F%2Fetc%2Fpasswd",
            "/data%3Aimage%2Fpng",
            "/%FF",
        ] {
            assert!(source_url(path).is_err(), "{path}");
        }
    }
}
