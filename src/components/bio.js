import React from "react";
import { useStaticQuery, graphql } from "gatsby";
import Image from "gatsby-image";

const Bio = () => {
  const data = useStaticQuery(graphql`
    query BioQuery {
      avatar: file(absolutePath: { regex: "/andrew-2019-03-24_300x300_min.jpg/" }) {
        childImageSharp {
          fixed(width: 50, height: 50) {
            ...GatsbyImageSharpFixed
          }
        }
      }
      site {
        siteMetadata {
          author {
            name
            summary
          }
          social {
            twitter
          }
        }
      }
    }
  `);

  const { author, social } = data.site.siteMetadata;
  return (
    <div className="flex items-center mt-6 mb-12">
      <Image
        fixed={data.avatar.childImageSharp.fixed}
        alt={author.name}
        style={{
          marginBottom: 0,
          minWidth: 50,
          borderRadius: `100%`,
        }}
        imgStyle={{
          borderRadius: `50%`,
        }}
      />
      <p className="ml-3">
        Written by <strong>{author.name}</strong>. {author.summary}
        {` `}
        <a
          className="text-blue-500 underline hover:no-underline"
          href={`https://twitter.com/${social.twitter}`}
        >
          You should follow him on Twitter
        </a>
      </p>
    </div>
  );
};

export default Bio;
