import React from 'react';
import '../styles.css';


export function ProfileSkeleton() {
  return (
    <main className="container-fluid bg-secondary text-center">
      <div className="BioContainer">
            <div className="bio">
                <h1>John Smith</h1>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipisicing elit. Vero distinctio recusandae nostrum optio, officiis quam magnam. Consectetur animi distinctio doloribus voluptates facilis laudantium molestiae autem unde, exercitationem eveniet, est repellat?
                </p>
            </div>
            <ul className="interests">
                <li>Interest Here</li>
                <li>Interest Here</li>
                <li>Interest Here</li>
                <li>Interest Here</li>
                <li>Interest Here</li>
            </ul>
            <p>Member since: x/x/xxxx</p>
            <div>
                <h3>Top Activities</h3>
                <ol>
                    <li>1</li>
                    <li>2</li>
                    <li>3</li>
                    <li>4</li>
                    <li>5</li>
                </ol>
            </div>
        </div>
        <img src="DefaultProfileImg.png" alt="Placeholder Profile Picture Image" className="profileImg" />

    </main>
  );
}