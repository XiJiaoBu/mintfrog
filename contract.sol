// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract VideoMinting {
    // This event is emitted when a video is minted, recording the user and the video hash.
    event VideoMinted(address indexed user, bytes32 videoHash);

    // Function to mint a video by hashing its content.
    function mintVideo(bytes32 videoHash) public {
        // Emits the event, showing that `msg.sender` (the caller) minted a video with this hash.
        emit VideoMinted(msg.sender, videoHash);
    }
}
