const clubService = require('../services/clubs/clubService');
const { getIO } = require('../socket/socketManager');

const createClub = async (req, res) => {
    const { name, description } = req.body;

    try {
        const club = await clubService.createClub({
            userId: req.user.id,
            name,
            description,
        });

        const io = getIO();
        if (io) {
            io.to(`user:${req.user.id}`).emit('club:joined', {
                eventType: 'club:joined',
                clubId: club.id,
            });
        }

        return res.status(201).json({ club });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to create club' });
    }
};

const joinClub = async (req, res) => {
    const { clubId } = req.params;

    try {
        await clubService.joinClub({ userId: req.user.id, clubId });

        const io = getIO();
        if (io) {
            io.to(`club:${clubId}`).emit('club:member:joined', {
                eventType: 'club:member:joined',
                clubId,
                userId: req.user.id,
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to join club' });
    }
};

const leaveClub = async (req, res) => {
    const { clubId } = req.params;

    try {
        await clubService.leaveClub({ userId: req.user.id, clubId });

        const io = getIO();
        if (io) {
            io.to(`club:${clubId}`).emit('club:member:left', {
                eventType: 'club:member:left',
                clubId,
                userId: req.user.id,
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to leave club' });
    }
};

const listClubs = async (_req, res) => {
    try {
        const clubs = await clubService.listClubs();
        return res.status(200).json({ clubs });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to list clubs' });
    }
};

const myClubs = async (req, res) => {
    try {
        const clubs = await clubService.myClubs(req.user.id);
        return res.status(200).json({ clubs });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to list my clubs' });
    }
};

module.exports = {
    createClub,
    joinClub,
    leaveClub,
    listClubs,
    myClubs,
};
