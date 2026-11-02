## LLL / implementation addition — YouTube clip for Creative Town case study

James explicitly wants this added to the Creative Town case study and implemented by Larry.

### Source embed

YouTube video:    
https://www.youtube.com/embed/2f5MvVx8RM8?si=SPMWBcjb4cTgmU3m

Owner-supplied iframe was 560×315 and allowed accelerometer, autoplay, clipboard-write, encrypted-media, gyroscope, picture-in-picture, web-share, fullscreen, with strict-origin-when-cross-origin referrer policy. Do **not** autoplay the finished case-study embed.

### Case-study copy / point

> This is almost exactly what working with robots on image generation feels like. You give the robot a perfectly reasonable instruction. It confidently does something else. So you clarify the instruction—carefully identifying the one thing it got wrong—and it fixes that while breaking something that had already been right. Correct that problem and an earlier mistake mysteriously returns. Before long, you’re no longer designing the image; you’re supervising an increasingly elaborate chain of unintended consequences while repeatedly explaining things you were fairly certain had already been settled. The robot isn’t being difficult. It isn’t being clever, either. It is enthusiastically executing the next instruction with absolutely no appreciation for why you’re slowly losing your mind. That was Creative Town: remarkably capable tools, capable of producing remarkable work, while remaining spectacularly dull.

This supports the existing Creative Town **dull tools** thesis and should read as comic evidence/illustration of the actual image-generation experience, not as an unrelated video insert.

### Approved accessibility transcript — exact embedded scene

This transcript was supplied by James for the exact YouTube clip. Store it with the Creative Town implementation and expose it to screen readers as the accessible text alternative for the embedded scene. Keep this simple: no extra transcript UI or controls are required.

00:00:01.000 --> 00:00:01.834  
Guards

00:00:02.877 --> 00:00:05.838  
Make sure the prince doesn't leave the room until get him

00:00:05.921 --> 00:00:08.924  
Not to leave the room even if you come and get him

00:00:09.008 --> 00:00:11.218  
No no Until come and get him

00:00:11.302 --> 00:00:14.597  
Until you come and get him we're not to enter the room

00:00:14.680 --> 00:00:19.643  
No no You stay in the room and make sure he doesn't leave

00:00:19.727 --> 00:00:21.729  
And you'll come and get him Right

00:00:22.396 --> 00:00:26.192  
We don't need to do anything apart from stop him entering the room

00:00:26.275 --> 00:00:29.612  
No no Leaving the room Leaving the room yes

00:00:29.695 --> 00:00:32.114  
All right Right If

00:00:32.198 --> 00:00:34.367  
If we're Yes what is it

00:00:36.369 --> 00:00:38.204  
Look it's quite simple

00:00:38.287 --> 00:00:42.625  
You just stay here and make sure he doesn't leave the room

00:00:43.667 --> 00:00:45.836  
All right Oh remember

00:00:46.587 --> 00:00:48.547  
Can he leave the room with us

00:00:48.631 --> 00:00:52.551  
No no You just keep him in here and make sure

00:00:52.635 --> 00:00:54.929  
Yes We'll keep him in here obviously

00:00:55.012 --> 00:00:58.224  
But if he had to leave No Keep him in here

00:00:58.307 --> 00:01:01.018  
Until you or anyone No Not anyone just me

00:01:01.102 --> 00:01:02.144  
Just you

00:01:02.228 --> 00:01:03.604  
Get back Get back

00:01:03.687 --> 00:01:04.688  
Right Right

00:01:04.772 --> 00:01:06.273  
We'll stay here until you get back

00:01:06.982 --> 00:01:09.276  
And make sure he doesn't leave What

00:01:11.112 --> 00:01:13.614  
Make sure he doesn't leave The prince

00:01:14.281 --> 00:01:17.910  
Yes make sure he doesn't leave Oh yes of course

00:01:17.993 --> 00:01:19.328  
thought you meant him

00:01:19.412 --> 00:01:22.581  
It seemed a bit daft me having to guard him when he's a guard

00:01:23.499 --> 00:01:26.377  
Is that clear Quite clear No problems

00:01:26.460 --> 00:01:27.461  
Right

00:01:29.755 --> 00:01:31.715  
Where are you going We're coming with you

00:01:32.466 --> 00:01:36.929  
No want you to stay here and make sure he doesn't leave

00:01:37.012 --> 00:01:38.180  
see right

### Larry implementation requirements

* Add the video to `/case-studies/creative-town` in the editorial location that best supports the image-generation failure / dull-tools narrative.
* Wrap it in the existing Creative Town / djamespoer.com case-study visual system. Do not leave a naked/raw iframe visually dropped into the article.
* Responsive at desktop/mobile widths; preserve 16:9 presentation without overflow.
* Accessible semantic context around the embed. Give the iframe a meaningful `title` describing the video/context rather than generic "YouTube video player" text.
* Keyboard-accessible YouTube controls and visible surrounding focus behavior must remain usable.
* No autoplay.
* Preserve fullscreen support.
* Store the approved transcript above directly with the implementation and expose it to assistive technology as the text alternative for this scene. Do not invent an additional visible transcript interface unless the existing site architecture requires one.
* Avoid accessibility-tree duplication between the iframe labeling, explanatory copy, and transcript.
* Respect existing case-study spacing, typography, surfaces/borders, responsive behavior, reduced-motion expectations, and performance conventions.
* Prefer privacy/performance-conscious loading behavior consistent with the site's existing external-media practices if such a pattern already exists; reuse rather than invent a parallel component.
* Verify desktop and mobile rendering, keyboard access, screen-reader access to the transcript, no horizontal overflow, and normal accessibility checks before considering the addition complete.

This is an **approved Creative Town addition**, not merely speculative source material.
